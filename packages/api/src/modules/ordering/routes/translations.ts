import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../../../middleware/auth.js';
import {
  menuItems,
  menuCategories,
  modifierGroups,
  modifierOptions,
  promotions,
  comboDeals,
  comboSlots,
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
