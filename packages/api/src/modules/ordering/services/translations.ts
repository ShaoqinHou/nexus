import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { contentTranslations, tenants } from '../../../db/schema.js';
import { translate, translateBatch } from '../../../lib/translate.js';
import type { DrizzleDB } from '../../../db/client.js';

// --- Translation Service ---

/**
 * Store (upsert) a single translation for an entity field.
 *
 * - source='auto' (default): will NOT overwrite an existing row whose source='manual'.
 *   This preserves human-entered overrides during automatic re-translation.
 * - source='manual': always writes through, overwriting previous value and marking the
 *   row as manual.
 */
export function setTranslation(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
  locale: string,
  field: string,
  value: string,
  source: 'auto' | 'manual' = 'auto',
) {
  const now = new Date().toISOString();

  // Check for existing translation
  const existing = db
    .select()
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.tenantId, tenantId),
        eq(contentTranslations.entityType, entityType),
        eq(contentTranslations.entityId, entityId),
        eq(contentTranslations.locale, locale),
        eq(contentTranslations.field, field),
      ),
    )
    .get();

  if (existing) {
    // Auto translations MUST NOT clobber a manual override.
    if (source === 'auto' && existing.source === 'manual') {
      return existing;
    }

    return db
      .update(contentTranslations)
      .set({ value, source, updatedAt: now })
      .where(eq(contentTranslations.id, existing.id))
      .returning()
      .get();
  }

  return db
    .insert(contentTranslations)
    .values({
      id: nanoid(),
      tenantId,
      entityType,
      entityId,
      locale,
      field,
      value,
      source,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

/**
 * Get ALL translation rows for an entity (across all locales/fields), with full metadata
 * including the `source` flag. Used by the merchant translation editor.
 */
export function getEntityTranslations(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
): Array<{ locale: string; field: string; value: string; source: 'auto' | 'manual' }> {
  const rows = db
    .select()
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.tenantId, tenantId),
        eq(contentTranslations.entityType, entityType),
        eq(contentTranslations.entityId, entityId),
      ),
    )
    .all();

  return rows.map((r) => ({
    locale: r.locale,
    field: r.field,
    value: r.value,
    source: (r.source ?? 'auto') as 'auto' | 'manual',
  }));
}

/**
 * Delete a specific translation row (entity/locale/field). Returns true if a row was
 * deleted. Used to reset a manual override back to auto — the caller is responsible for
 * re-running autoTranslateEntity to regenerate the auto value.
 */
export function deleteTranslation(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
  locale: string,
  field: string,
): boolean {
  const result = db
    .delete(contentTranslations)
    .where(
      and(
        eq(contentTranslations.tenantId, tenantId),
        eq(contentTranslations.entityType, entityType),
        eq(contentTranslations.entityId, entityId),
        eq(contentTranslations.locale, locale),
        eq(contentTranslations.field, field),
      ),
    )
    .run();
  return (result.changes ?? 0) > 0;
}

/**
 * Delete all translations for an entity in a specific locale (or all locales if omitted).
 * When `preserveManual` is true, rows with source='manual' are kept intact.
 */
export function deleteEntityTranslations(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
  locale?: string,
  preserveManual = true,
): number {
  const conditions = [
    eq(contentTranslations.tenantId, tenantId),
    eq(contentTranslations.entityType, entityType),
    eq(contentTranslations.entityId, entityId),
  ];
  if (locale) conditions.push(eq(contentTranslations.locale, locale));
  if (preserveManual) conditions.push(eq(contentTranslations.source, 'auto'));

  const result = db
    .delete(contentTranslations)
    .where(and(...conditions))
    .run();
  return result.changes ?? 0;
}

/**
 * Get all translations for a specific entity in a given locale.
 * Returns a map of field -> value.
 */
export function getTranslations(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
  locale: string,
): Record<string, string> {
  const rows = db
    .select()
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.tenantId, tenantId),
        eq(contentTranslations.entityType, entityType),
        eq(contentTranslations.entityId, entityId),
        eq(contentTranslations.locale, locale),
      ),
    )
    .all();

  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.field] = row.value;
  }
  return result;
}

/**
 * Get all translations for a locale across all entities.
 * Useful for bulk menu serving — avoids N+1 queries.
 * Returns a nested map: entityType -> entityId -> field -> value.
 */
export function getTranslationsForLocale(
  db: DrizzleDB,
  tenantId: string,
  locale: string,
): Record<string, Record<string, Record<string, string>>> {
  const rows = db
    .select()
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.tenantId, tenantId),
        eq(contentTranslations.locale, locale),
      ),
    )
    .all();

  const result: Record<string, Record<string, Record<string, string>>> = {};
  for (const row of rows) {
    if (!result[row.entityType]) result[row.entityType] = {};
    if (!result[row.entityType][row.entityId]) result[row.entityType][row.entityId] = {};
    result[row.entityType][row.entityId][row.field] = row.value;
  }
  return result;
}

/**
 * Read the tenant's primary locale from settings.
 * Defaults to 'en'.
 */
export function getTenantPrimaryLocale(db: DrizzleDB, tenantId: string): string {
  const tenant = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenant?.settings) return 'en';
  try {
    const settings = JSON.parse(tenant.settings) as { primaryLocale?: string };
    return settings.primaryLocale ?? 'en';
  } catch {
    return 'en';
  }
}

/**
 * Read the tenant's additional (translated) locales from settings.
 * These are the languages customers can switch to beyond the primary.
 * Returns an array of locale codes, defaults to empty.
 */
export function getTenantLocales(db: DrizzleDB, tenantId: string): string[] {
  const tenant = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenant?.settings) return [];
  try {
    const settings = JSON.parse(tenant.settings) as { supportedLocales?: string[] };
    return settings.supportedLocales ?? [];
  } catch {
    return [];
  }
}

/**
 * Read the tenant's kitchenLocale from settings.
 * Defaults to 'en'.
 */
export function getKitchenLocale(db: DrizzleDB, tenantId: string): string {
  const tenant = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenant?.settings) return 'en';
  try {
    const settings = JSON.parse(tenant.settings) as { kitchenLocale?: string };
    return settings.kitchenLocale ?? 'en';
  } catch {
    return 'en';
  }
}

/**
 * Auto-translate an entity's fields to all configured additional locales.
 * Uses the batch API for efficiency when there are multiple fields.
 * Source locale defaults to the tenant's primary language.
 */
export async function autoTranslateEntity(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
  fields: Record<string, string>,
  context: string,
  sourceLocale?: string,
): Promise<void> {
  const resolvedSource = sourceLocale ?? getTenantPrimaryLocale(db, tenantId);
  const locales = getTenantLocales(db, tenantId);
  const targetLocales = locales.filter((l) => l !== resolvedSource);

  if (targetLocales.length === 0) return;

  // Filter out empty fields
  const nonEmptyFields = Object.entries(fields).filter(([, v]) => v && v.trim().length > 0);
  if (nonEmptyFields.length === 0) return;

  for (const locale of targetLocales) {
    if (nonEmptyFields.length === 1) {
      // Single field — use simple translate
      const [field, text] = nonEmptyFields[0];
      const translated = await translate({
        text,
        targetLocale: locale,
        context: `${context} ${field}`,
        sourceLocale: resolvedSource,
      });
      setTranslation(db, tenantId, entityType, entityId, locale, field, translated, 'auto');
    } else {
      // Multiple fields — use batch translate
      const items = nonEmptyFields.map(([field, text]) => ({
        key: field,
        text,
        context: `${context} ${field}`,
      }));
      const translations = await translateBatch(items, locale, resolvedSource);
      for (const [field, translated] of translations) {
        setTranslation(db, tenantId, entityType, entityId, locale, field, translated, 'auto');
      }
    }
  }
}

/**
 * Translate a single text string for kitchen display.
 * Returns the translated string, or the original if translation fails.
 */
export async function translateForKitchen(
  db: DrizzleDB,
  tenantId: string,
  text: string,
  context: string,
  sourceLocale?: string,
): Promise<string> {
  const resolvedSource = sourceLocale ?? getTenantPrimaryLocale(db, tenantId);
  const kitchenLocale = getKitchenLocale(db, tenantId);
  if (kitchenLocale === resolvedSource) return text;

  return translate({
    text,
    targetLocale: kitchenLocale,
    context,
    sourceLocale: resolvedSource,
  });
}
