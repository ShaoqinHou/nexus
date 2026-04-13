import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { contentTranslations, tenants } from '../../../db/schema.js';
import { translate, translateBatch } from '../../../lib/translate.js';
import type { DrizzleDB } from '../../../db/client.js';

// --- Translation Service ---

/**
 * Store (upsert) a single translation for an entity field.
 */
export function setTranslation(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
  locale: string,
  field: string,
  value: string,
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
    return db
      .update(contentTranslations)
      .set({ value, updatedAt: now })
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
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
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
 * Read the tenant's supportedLocales from settings.
 * Returns an array of locale codes, defaults to ['en'].
 */
function getTenantLocales(db: DrizzleDB, tenantId: string): string[] {
  const tenant = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenant?.settings) return ['en'];
  try {
    const settings = JSON.parse(tenant.settings) as { supportedLocales?: string[] };
    return settings.supportedLocales ?? ['en'];
  } catch {
    return ['en'];
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
 * Auto-translate an entity's fields to all configured locales.
 * Uses the batch API for efficiency when there are multiple fields.
 * Skips the source locale (defaults to 'en').
 */
export async function autoTranslateEntity(
  db: DrizzleDB,
  tenantId: string,
  entityType: string,
  entityId: string,
  fields: Record<string, string>,
  context: string,
  sourceLocale = 'en',
): Promise<void> {
  const locales = getTenantLocales(db, tenantId);
  const targetLocales = locales.filter((l) => l !== sourceLocale);

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
        sourceLocale,
      });
      setTranslation(db, tenantId, entityType, entityId, locale, field, translated);
    } else {
      // Multiple fields — use batch translate
      const items = nonEmptyFields.map(([field, text]) => ({
        key: field,
        text,
        context: `${context} ${field}`,
      }));
      const translations = await translateBatch(items, locale);
      for (const [field, translated] of translations) {
        setTranslation(db, tenantId, entityType, entityId, locale, field, translated);
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
  const kitchenLocale = getKitchenLocale(db, tenantId);
  if (kitchenLocale === (sourceLocale || 'en')) return text;

  return translate({
    text,
    targetLocale: kitchenLocale,
    context,
    sourceLocale,
  });
}
