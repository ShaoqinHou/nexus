import { eq, and } from 'drizzle-orm';
import { menuCategories, menuItems } from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';
import { getItemModifierGroups } from './modifiers.js';
import { getPublicCombos } from './combos.js';

// --- Menu Item Service ---

export function getMenuItems(db: DrizzleDB, tenantId: string, categoryId?: string) {
  const conditions = [
    eq(menuItems.tenantId, tenantId),
    eq(menuItems.isActive, 1),
  ];
  if (categoryId) {
    conditions.push(eq(menuItems.categoryId, categoryId));
  }

  return db
    .select()
    .from(menuItems)
    .where(and(...conditions))
    .orderBy(menuItems.sortOrder)
    .all();
}

export function createMenuItem(
  db: DrizzleDB,
  tenantId: string,
  data: {
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
  }
) {
  // Verify category exists and belongs to tenant
  const category = db
    .select()
    .from(menuCategories)
    .where(
      and(
        eq(menuCategories.id, data.categoryId),
        eq(menuCategories.tenantId, tenantId),
        eq(menuCategories.isActive, 1)
      )
    )
    .get();

  if (!category) {
    return { error: 'Category not found' as const };
  }

  const item = db
    .insert(menuItems)
    .values({
      tenantId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      imageUrl: data.imageUrl ?? null,
    })
    .returning()
    .get();

  return { data: item };
}

export function updateMenuItem(
  db: DrizzleDB,
  tenantId: string,
  itemId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isAvailable?: number;
    sortOrder?: number;
    categoryId?: string;
  }
) {
  // If categoryId is being changed, verify the new category exists and belongs to tenant
  if (data.categoryId !== undefined) {
    const category = db
      .select()
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.id, data.categoryId),
          eq(menuCategories.tenantId, tenantId),
          eq(menuCategories.isActive, 1)
        )
      )
      .get();

    if (!category) {
      return { error: 'Category not found' as const };
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

  const item = db
    .update(menuItems)
    .set(updateData)
    .where(
      and(
        eq(menuItems.id, itemId),
        eq(menuItems.tenantId, tenantId)
      )
    )
    .returning()
    .get();

  if (!item) {
    return { error: 'Item not found' as const };
  }

  return { data: item };
}

export function deleteMenuItem(db: DrizzleDB, tenantId: string, itemId: string) {
  return db
    .update(menuItems)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(menuItems.id, itemId),
        eq(menuItems.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

// --- Public Menu (Customer) ---

export function getPublicMenu(db: DrizzleDB, tenantId: string) {
  const categories = db
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

  const menuByCategory = categories.map((category) => {
    const items = db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          eq(menuItems.categoryId, category.id),
          eq(menuItems.isActive, 1),
          eq(menuItems.isAvailable, 1)
        )
      )
      .orderBy(menuItems.sortOrder)
      .all();

    const itemsWithModifiers = items.map((item) => {
      const itemModifierGroups = getItemModifierGroups(db, tenantId, item.id);
      return { ...item, modifierGroups: itemModifierGroups };
    });

    return { category, items: itemsWithModifiers };
  });

  // Include combo deals
  const combos = getPublicCombos(db, tenantId);

  // Include featured items
  const featured = db
    .select()
    .from(menuItems)
    .where(
      and(
        eq(menuItems.tenantId, tenantId),
        eq(menuItems.isActive, 1),
        eq(menuItems.isAvailable, 1),
        eq(menuItems.isFeatured, 1)
      )
    )
    .orderBy(menuItems.sortOrder)
    .all();

  return { categories: menuByCategory, combos, featured };
}
