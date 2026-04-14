import { eq, and, inArray } from 'drizzle-orm';
import {
  menuCategories,
  menuItems,
  menuItemModifierGroups,
  modifierGroups,
} from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';
import { getItemModifierGroups } from './modifiers.js';
import { getPublicCombos } from './combos.js';
import { getTranslationsForLocale, getTenantPrimaryLocale } from './translations.js';

// --- Menu Item Service ---

export function getMenuItems(db: DrizzleDB, tenantId: string, categoryId?: string) {
  const conditions = [
    eq(menuItems.tenantId, tenantId),
    eq(menuItems.isActive, 1),
  ];
  if (categoryId) {
    conditions.push(eq(menuItems.categoryId, categoryId));
  }

  const items = db
    .select()
    .from(menuItems)
    .where(and(...conditions))
    .orderBy(menuItems.sortOrder)
    .all();

  if (items.length === 0) {
    return items.map((item) => ({ ...item, modifierGroupIds: [] as string[] }));
  }

  // Single query: fetch all modifier-group links for this tenant's items.
  // The junction table has no tenant_id, so we scope via inner-join on
  // modifierGroups (which has tenantId) to guarantee isolation.
  const itemIds = items.map((i) => i.id);
  const links = db
    .select({
      menuItemId: menuItemModifierGroups.menuItemId,
      modifierGroupId: menuItemModifierGroups.modifierGroupId,
      sortOrder: menuItemModifierGroups.sortOrder,
    })
    .from(menuItemModifierGroups)
    .innerJoin(
      modifierGroups,
      eq(modifierGroups.id, menuItemModifierGroups.modifierGroupId)
    )
    .where(
      and(
        inArray(menuItemModifierGroups.menuItemId, itemIds),
        eq(modifierGroups.tenantId, tenantId),
        eq(modifierGroups.isActive, 1)
      )
    )
    .orderBy(menuItemModifierGroups.sortOrder)
    .all();

  const byItem = new Map<string, string[]>();
  for (const link of links) {
    const arr = byItem.get(link.menuItemId);
    if (arr) {
      arr.push(link.modifierGroupId);
    } else {
      byItem.set(link.menuItemId, [link.modifierGroupId]);
    }
  }

  return items.map((item) => ({
    ...item,
    modifierGroupIds: byItem.get(item.id) ?? [],
  }));
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
    tags?: string;
    allergens?: string;
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
      tags: data.tags ?? null,
      allergens: data.allergens ?? null,
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
    tags?: string;
    allergens?: string;
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
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.allergens !== undefined) updateData.allergens = data.allergens;
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

export function getPublicMenu(db: DrizzleDB, tenantId: string, locale?: string) {
  // Load translations for the requested locale (single query for all entities)
  const primaryLocale = getTenantPrimaryLocale(db, tenantId);
  const translations = locale && locale !== primaryLocale
    ? getTranslationsForLocale(db, tenantId, locale)
    : null;

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
    // Apply category translations if available
    const catTranslations = translations?.menu_category?.[category.id];
    const translatedCategory = catTranslations
      ? {
          ...category,
          name: catTranslations.name || category.name,
          description: catTranslations.description || category.description,
        }
      : category;

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

      // Apply item translations if available
      const itemTranslations = translations?.menu_item?.[item.id];
      const translatedItem = itemTranslations
        ? {
            ...item,
            name: itemTranslations.name || item.name,
            description: itemTranslations.description || item.description,
          }
        : item;

      return { ...translatedItem, modifierGroups: itemModifierGroups };
    });

    return { category: translatedCategory, items: itemsWithModifiers };
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
    .all()
    .map((item) => {
      // Apply translations to featured items too
      const itemTranslations = translations?.menu_item?.[item.id];
      return itemTranslations
        ? {
            ...item,
            name: itemTranslations.name || item.name,
            description: itemTranslations.description || item.description,
          }
        : item;
    });

  return { categories: menuByCategory, combos, featured };
}
