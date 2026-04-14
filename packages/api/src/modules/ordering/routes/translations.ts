import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { authMiddleware } from '../../../middleware/auth.js';
import {
  menuItems,
  menuCategories,
  modifierGroups,
  modifierOptions,
  promotions,
  comboDeals,
  comboSlots,
  contentTranslations,
} from '../../../db/schema.js';
import {
  setTranslation,
  deleteTranslation,
  deleteEntityTranslations,
  getEntityTranslations,
  getTenantPrimaryLocale,
  getTenantLocales,
  autoTranslateEntity,
} from '../services/translations.js';
import type { DrizzleDB } from '../../../db/client.js';
import type { AuthEnv } from '../../../lib/types.js';

// --- Whitelist of supported entity types (and the fields they expose) ---

export const ENTITY_FIELDS: Record<string, readonly string[]> = {
  menu_item: ['name', 'description'],
  menu_category: ['name', 'description'],
  modifier_group: ['name'],
  modifier_option: ['name'],
  promotion: ['name', 'description'],
  combo_deal: ['name', 'description'],
  combo_slot: ['name'],
};

export const ENTITY_CONTEXT: Record<string, string> = {
  menu_item: 'menu item',
  menu_category: 'menu category',
  modifier_group: 'modifier group',
  modifier_option: 'modifier option',
  promotion: 'promotion',
  combo_deal: 'combo deal',
  combo_slot: 'combo slot',
};

const SUPPORTED_ENTITY_TYPES = Object.keys(ENTITY_FIELDS);

/**
 * Verify the entity exists and belongs to this tenant. Returns the row (with the
 * relevant translatable fields) on success, null on miss. For child entities that
 * don't carry tenantId directly (modifier_option, combo_slot), we resolve the
 * tenant via their parent table.
 */
function verifyEntity(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
): { name?: string | null; description?: string | null } | null {
  switch (entityType) {
    case 'menu_item': {
      const row = db
        .select()
        .from(menuItems)
        .where(and(eq(menuItems.tenantId, tenantId), eq(menuItems.id, entityId)))
        .get();
      return row ? { name: row.name, description: row.description } : null;
    }
    case 'menu_category': {
      const row = db
        .select()
        .from(menuCategories)
        .where(and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.id, entityId)))
        .get();
      return row ? { name: row.name, description: row.description } : null;
    }
    case 'modifier_group': {
      const row = db
        .select()
        .from(modifierGroups)
        .where(and(eq(modifierGroups.tenantId, tenantId), eq(modifierGroups.id, entityId)))
        .get();
      return row ? { name: row.name } : null;
    }
    case 'modifier_option': {
      const row = db
        .select({
          id: modifierOptions.id,
          name: modifierOptions.name,
          groupTenantId: modifierGroups.tenantId,
        })
        .from(modifierOptions)
        .innerJoin(modifierGroups, eq(modifierOptions.groupId, modifierGroups.id))
        .where(eq(modifierOptions.id, entityId))
        .get();
      if (!row || row.groupTenantId !== tenantId) return null;
      return { name: row.name };
    }
    case 'promotion': {
      const row = db
        .select()
        .from(promotions)
        .where(and(eq(promotions.tenantId, tenantId), eq(promotions.id, entityId)))
        .get();
      return row ? { name: row.name, description: row.description } : null;
    }
    case 'combo_deal': {
      const row = db
        .select()
        .from(comboDeals)
        .where(and(eq(comboDeals.tenantId, tenantId), eq(comboDeals.id, entityId)))
        .get();
      return row ? { name: row.name, description: row.description } : null;
    }
    case 'combo_slot': {
      const row = db
        .select({
          id: comboSlots.id,
          name: comboSlots.name,
          dealTenantId: comboDeals.tenantId,
        })
        .from(comboSlots)
        .innerJoin(comboDeals, eq(comboSlots.comboDealId, comboDeals.id))
        .where(eq(comboSlots.id, entityId))
        .get();
      if (!row || row.dealTenantId !== tenantId) return null;
      return { name: row.name };
    }
    default:
      return null;
  }
}

function isSupportedEntityType(entityType: string): boolean {
  return SUPPORTED_ENTITY_TYPES.includes(entityType);
}

function isAllowedField(entityType: string, field: string): boolean {
  return ENTITY_FIELDS[entityType]?.includes(field) ?? false;
}

/**
 * Build the fields map (current source values) from the verified entity row,
 * filtered by what's allowed for that entity type.
 */
function fieldsFromEntity(
  entityType: string,
  row: { name?: string | null; description?: string | null },
): Record<string, string> {
  const allowed = ENTITY_FIELDS[entityType] ?? [];
  const out: Record<string, string> = {};
  for (const f of allowed) {
    const v = (row as Record<string, string | null | undefined>)[f];
    if (v && v.trim().length > 0) out[f] = v;
  }
  return out;
}

/**
 * Generic translations sub-router. Mounted under `/translations` on the staff
 * ordering router so the full path is e.g.
 *   /api/t/:tenantSlug/ordering/translations/:entityType/:entityId
 */
export function translationsRoutes(db: DrizzleDB) {
  const router = new Hono<AuthEnv>();

  // All routes require staff auth (auth middleware also runs on the parent router,
  // but mounting it here too is harmless and keeps this sub-router self-contained).
  router.use('*', authMiddleware(db));

  // GET — aggregate dashboard overview (counts + recent manual edits)
  // Owner/manager only — translation management is a privileged operation.
  router.get('/overview', (c) => {
    const tenantId = c.var.tenantId;
    const user = c.var.user;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Only owner or manager can view translation dashboard' }, 403);
    }

    const allRows = db
      .select()
      .from(contentTranslations)
      .where(eq(contentTranslations.tenantId, tenantId))
      .all();

    // Initialize counts for every supported entity type so the dashboard can
    // render a row even when there are zero translations of that kind yet.
    const counts: Record<
      string,
      { manual: number; auto: number; locales: string[] }
    > = {};
    for (const type of SUPPORTED_ENTITY_TYPES) {
      counts[type] = { manual: 0, auto: 0, locales: [] };
    }

    const localesByType: Record<string, Set<string>> = {};
    for (const row of allRows) {
      if (!counts[row.entityType]) {
        // Unknown entity type — still count it so we don't lose data, but it
        // won't show up in the dashboard's typed table.
        counts[row.entityType] = { manual: 0, auto: 0, locales: [] };
      }
      if (row.source === 'manual') counts[row.entityType].manual++;
      else counts[row.entityType].auto++;

      if (!localesByType[row.entityType]) localesByType[row.entityType] = new Set();
      localesByType[row.entityType].add(row.locale);
    }
    for (const type of Object.keys(counts)) {
      counts[type].locales = Array.from(localesByType[type] ?? []).sort();
    }

    // Recent manual edits — last 20, ordered by updatedAt DESC.
    const recentRows = db
      .select()
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.tenantId, tenantId),
          eq(contentTranslations.source, 'manual'),
        ),
      )
      .orderBy(desc(contentTranslations.updatedAt))
      .limit(20)
      .all();

    // Bulk-load entity names per type so we don't issue one query per row.
    const idsByType: Record<string, Set<string>> = {};
    for (const row of recentRows) {
      if (!idsByType[row.entityType]) idsByType[row.entityType] = new Set();
      idsByType[row.entityType].add(row.entityId);
    }

    const namesByTypeId: Record<string, Record<string, string>> = {};

    function loadNames(
      type: string,
      ids: string[],
      loader: () => Array<{ id: string; name: string }>,
    ) {
      if (ids.length === 0) return;
      namesByTypeId[type] = {};
      for (const r of loader()) {
        namesByTypeId[type][r.id] = r.name;
      }
    }

    if (idsByType.menu_item) {
      const ids = Array.from(idsByType.menu_item);
      loadNames('menu_item', ids, () =>
        db
          .select({ id: menuItems.id, name: menuItems.name })
          .from(menuItems)
          .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, ids), eq(menuItems.isActive, 1)))
          .all(),
      );
    }
    if (idsByType.menu_category) {
      const ids = Array.from(idsByType.menu_category);
      loadNames('menu_category', ids, () =>
        db
          .select({ id: menuCategories.id, name: menuCategories.name })
          .from(menuCategories)
          .where(and(eq(menuCategories.tenantId, tenantId), inArray(menuCategories.id, ids), eq(menuCategories.isActive, 1)))
          .all(),
      );
    }
    if (idsByType.modifier_group) {
      const ids = Array.from(idsByType.modifier_group);
      loadNames('modifier_group', ids, () =>
        db
          .select({ id: modifierGroups.id, name: modifierGroups.name })
          .from(modifierGroups)
          .where(and(eq(modifierGroups.tenantId, tenantId), inArray(modifierGroups.id, ids), eq(modifierGroups.isActive, 1)))
          .all(),
      );
    }
    if (idsByType.modifier_option) {
      // modifier_option has no direct tenantId — gate via parent group.
      const ids = Array.from(idsByType.modifier_option);
      const rows = db
        .select({
          id: modifierOptions.id,
          name: modifierOptions.name,
          tenantId: modifierGroups.tenantId,
          active: modifierOptions.isActive,
        })
        .from(modifierOptions)
        .innerJoin(modifierGroups, eq(modifierOptions.groupId, modifierGroups.id))
        .where(inArray(modifierOptions.id, ids))
        .all();
      namesByTypeId.modifier_option = {};
      for (const r of rows) {
        if (r.tenantId === tenantId && r.active === 1) {
          namesByTypeId.modifier_option[r.id] = r.name;
        }
      }
    }
    if (idsByType.promotion) {
      const ids = Array.from(idsByType.promotion);
      loadNames('promotion', ids, () =>
        db
          .select({ id: promotions.id, name: promotions.name })
          .from(promotions)
          .where(and(eq(promotions.tenantId, tenantId), inArray(promotions.id, ids), eq(promotions.isActive, 1)))
          .all(),
      );
    }
    if (idsByType.combo_deal) {
      const ids = Array.from(idsByType.combo_deal);
      loadNames('combo_deal', ids, () =>
        db
          .select({ id: comboDeals.id, name: comboDeals.name })
          .from(comboDeals)
          .where(and(eq(comboDeals.tenantId, tenantId), inArray(comboDeals.id, ids), eq(comboDeals.isActive, 1)))
          .all(),
      );
    }
    if (idsByType.combo_slot) {
      // combo_slot has no direct tenantId — gate via parent comboDeal.
      const ids = Array.from(idsByType.combo_slot);
      const rows = db
        .select({
          id: comboSlots.id,
          name: comboSlots.name,
          tenantId: comboDeals.tenantId,
          dealActive: comboDeals.isActive,
        })
        .from(comboSlots)
        .innerJoin(comboDeals, eq(comboSlots.comboDealId, comboDeals.id))
        .where(inArray(comboSlots.id, ids))
        .all();
      namesByTypeId.combo_slot = {};
      for (const r of rows) {
        if (r.tenantId === tenantId && r.dealActive === 1) {
          namesByTypeId.combo_slot[r.id] = r.name;
        }
      }
    }

    // Filter out edits whose entity is missing/soft-deleted (not in the names map).
    const recentEdits = recentRows
      .map((row) => {
        const entityName = namesByTypeId[row.entityType]?.[row.entityId];
        if (!entityName) return null;
        return {
          entityType: row.entityType,
          entityId: row.entityId,
          entityName,
          field: row.field,
          locale: row.locale,
          value: row.value,
          source: row.source,
          updatedAt: row.updatedAt,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return c.json({ data: { counts, recentEdits } });
  });

  // GET — list all translations for entity
  router.get('/:entityType/:entityId', (c) => {
    const tenantId = c.var.tenantId;
    const entityType = c.req.param('entityType');
    const entityId = c.req.param('entityId');

    if (!isSupportedEntityType(entityType)) {
      return c.json({ error: `Unsupported entity type: ${entityType}` }, 400);
    }

    const entity = verifyEntity(db, tenantId, entityType, entityId);
    if (!entity) {
      return c.json({ error: 'Entity not found' }, 404);
    }

    const translations = getEntityTranslations(db, tenantId, entityType, entityId);
    return c.json({ data: { translations } });
  });

  // PUT — set a manual translation for (locale, field)
  router.put(
    '/:entityType/:entityId/:locale/:field',
    zValidator('json', z.object({ value: z.string().min(1, 'Value is required') })),
    (c) => {
      const tenantId = c.var.tenantId;
      const user = c.var.user;
      if (user.role !== 'owner' && user.role !== 'manager') {
        return c.json({ error: 'Only owner or manager can edit translations' }, 403);
      }

      const entityType = c.req.param('entityType');
      const entityId = c.req.param('entityId');
      const locale = c.req.param('locale');
      const field = c.req.param('field');
      const { value } = c.req.valid('json');

      if (!isSupportedEntityType(entityType)) {
        return c.json({ error: `Unsupported entity type: ${entityType}` }, 400);
      }
      if (!isAllowedField(entityType, field)) {
        return c.json(
          {
            error: `Field '${field}' not allowed for ${entityType} (allowed: ${(
              ENTITY_FIELDS[entityType] ?? []
            ).join(', ')})`,
          },
          400,
        );
      }

      const entity = verifyEntity(db, tenantId, entityType, entityId);
      if (!entity) {
        return c.json({ error: 'Entity not found' }, 404);
      }

      setTranslation(db, tenantId, entityType, entityId, locale, field, value, 'manual');
      return c.json({
        data: { translation: { locale, field, value, source: 'manual' as const } },
      });
    },
  );

  // DELETE — reset a manual translation back to AI (and re-translate from source).
  router.delete('/:entityType/:entityId/:locale/:field', async (c) => {
    const tenantId = c.var.tenantId;
    const user = c.var.user;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Only owner or manager can edit translations' }, 403);
    }

    const entityType = c.req.param('entityType');
    const entityId = c.req.param('entityId');
    const locale = c.req.param('locale');
    const field = c.req.param('field');

    if (!isSupportedEntityType(entityType)) {
      return c.json({ error: `Unsupported entity type: ${entityType}` }, 400);
    }
    if (!isAllowedField(entityType, field)) {
      return c.json(
        {
          error: `Field '${field}' not allowed for ${entityType} (allowed: ${(
            ENTITY_FIELDS[entityType] ?? []
          ).join(', ')})`,
        },
        400,
      );
    }

    const entity = verifyEntity(db, tenantId, entityType, entityId);
    if (!entity) {
      return c.json({ error: 'Entity not found' }, 404);
    }

    deleteTranslation(db, tenantId, entityType, entityId, locale, field);

    // Fire-and-forget regeneration from source values.
    try {
      const fields = fieldsFromEntity(entityType, entity);
      if (Object.keys(fields).length > 0) {
        autoTranslateEntity(
          db,
          tenantId,
          entityType,
          entityId,
          fields,
          ENTITY_CONTEXT[entityType] ?? entityType,
        ).catch((err) =>
          console.error(
            `Auto-translate (reset) failed for ${entityType}:`,
            err instanceof Error ? err.message : err,
          ),
        );
      }
    } catch (err) {
      console.error(
        `Auto-translate (reset) setup failed for ${entityType}:`,
        err instanceof Error ? err.message : err,
      );
    }

    return c.json({ data: { deleted: true } });
  });

  // POST — regenerate all auto translations for this entity. Optionally restrict to
  // specific locales, and force-overwrite manual translations.
  router.post(
    '/:entityType/:entityId/regenerate',
    zValidator(
      'json',
      z
        .object({
          locales: z.array(z.string()).optional(),
          forceAll: z.boolean().optional(),
        })
        .default({}),
    ),
    async (c) => {
      const tenantId = c.var.tenantId;
      const user = c.var.user;
      if (user.role !== 'owner' && user.role !== 'manager') {
        return c.json({ error: 'Only owner or manager can regenerate translations' }, 403);
      }

      const entityType = c.req.param('entityType');
      const entityId = c.req.param('entityId');
      const body = c.req.valid('json') as { locales?: string[]; forceAll?: boolean };

      if (!isSupportedEntityType(entityType)) {
        return c.json({ error: `Unsupported entity type: ${entityType}` }, 400);
      }

      const entity = verifyEntity(db, tenantId, entityType, entityId);
      if (!entity) {
        return c.json({ error: 'Entity not found' }, 404);
      }

      const primaryLocale = getTenantPrimaryLocale(db, tenantId);
      const allLocales = getTenantLocales(db, tenantId);
      const targetLocales = (body.locales && body.locales.length > 0
        ? body.locales
        : allLocales
      ).filter((l) => l !== primaryLocale);

      // Clear existing auto translations (preserving manual unless forceAll is set)
      for (const locale of targetLocales) {
        deleteEntityTranslations(db, tenantId, entityType, entityId, locale, !body.forceAll);
      }

      const fields = fieldsFromEntity(entityType, entity);

      if (Object.keys(fields).length > 0 && targetLocales.length > 0) {
        try {
          await autoTranslateEntity(
            db,
            tenantId,
            entityType,
            entityId,
            fields,
            ENTITY_CONTEXT[entityType] ?? entityType,
          );
        } catch (err) {
          console.error(
            `Regenerate translations failed for ${entityType}:`,
            err instanceof Error ? err.message : err,
          );
          return c.json({ error: 'Translation regeneration failed' }, 500);
        }
      }

      const translations = getEntityTranslations(db, tenantId, entityType, entityId);
      return c.json({ data: { translations } });
    },
  );

  return router;
}
