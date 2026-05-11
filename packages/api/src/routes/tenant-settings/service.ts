import { eq } from 'drizzle-orm';
import { tenants } from '../../db/schema.js';
import type { DrizzleDB } from '../../db/client.js';
import type { TenantSettingsRecord, TenantSettingsUpdate } from './schema.js';

export function canUpdateTenantSettings(role: string): boolean {
  return role === 'owner' || role === 'manager';
}

export function parseTenantSettings(raw: string | null | undefined): TenantSettingsRecord {
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as TenantSettingsRecord
    : {};
}

export function mergeTenantSettings(
  existingSettings: TenantSettingsRecord,
  updates: TenantSettingsUpdate,
): TenantSettingsRecord {
  const merged: TenantSettingsRecord = { ...existingSettings };
  for (const [key, value] of Object.entries(updates)) {
    if (value === '' || value === undefined) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export function updateTenantSettings(
  db: DrizzleDB,
  tenantId: string,
  existingSettingsRaw: string | null | undefined,
  updates: TenantSettingsUpdate,
): TenantSettingsRecord {
  const merged = mergeTenantSettings(parseTenantSettings(existingSettingsRaw), updates);
  const updatedTenant = db
    .update(tenants)
    .set({
      settings: JSON.stringify(merged),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tenants.id, tenantId))
    .returning()
    .get();

  return parseTenantSettings(updatedTenant.settings);
}
