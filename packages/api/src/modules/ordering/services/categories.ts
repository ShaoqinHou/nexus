import { eq, and } from 'drizzle-orm';
import { menuCategories } from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';

// --- Menu Category Service ---

export function getCategories(db: DrizzleDB, tenantId: string) {
  return db
    .select()
    .from(menuCategories)
    .where(
      and(
        eq(menuCategories.tenantId, tenantId),
        eq(menuCategories.isActive, 1)
      )
    )
    .orderBy(menuCategories.sortOrder)
    .all();
}

export function createCategory(
  db: DrizzleDB,
  tenantId: string,
  data: { name: string; description?: string }
) {
  return db
    .insert(menuCategories)
    .values({
      tenantId,
      name: data.name,
      description: data.description ?? null,
    })
    .returning()
    .get();
}

export function updateCategory(
  db: DrizzleDB,
  tenantId: string,
  categoryId: string,
  data: { name?: string; description?: string; station?: string; sortOrder?: number; isActive?: number }
) {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.station !== undefined) updateData.station = data.station;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return db
    .update(menuCategories)
    .set(updateData)
    .where(
      and(
        eq(menuCategories.id, categoryId),
        eq(menuCategories.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function deleteCategory(db: DrizzleDB, tenantId: string, categoryId: string) {
  return db
    .update(menuCategories)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(menuCategories.id, categoryId),
        eq(menuCategories.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}
