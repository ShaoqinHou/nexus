import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  menuCategories,
  menuItems,
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
  promotions,
  promoCodes,
  comboDeals,
  comboSlots,
  comboSlotOptions,
  orders,
  orderItems,
} from '../../db/schema.js';
import type { DrizzleDB } from '../../db/client.js';
import type { OrderStatus, Promotion, PromotionType } from '../../db/schema.js';

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
  data: { name?: string; description?: string; sortOrder?: number; isActive?: number }
) {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
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

// --- Modifier Group Service ---

export function getModifierGroups(db: DrizzleDB, tenantId: string) {
  const groups = db
    .select()
    .from(modifierGroups)
    .where(
      and(
        eq(modifierGroups.tenantId, tenantId),
        eq(modifierGroups.isActive, 1)
      )
    )
    .orderBy(modifierGroups.sortOrder)
    .all();

  return groups.map((group) => {
    const options = db
      .select()
      .from(modifierOptions)
      .where(
        and(
          eq(modifierOptions.groupId, group.id),
          eq(modifierOptions.isActive, 1)
        )
      )
      .orderBy(modifierOptions.sortOrder)
      .all();

    return { ...group, options };
  });
}

export function createModifierGroup(
  db: DrizzleDB,
  tenantId: string,
  data: { name: string; minSelections?: number; maxSelections?: number }
) {
  return db
    .insert(modifierGroups)
    .values({
      tenantId,
      name: data.name,
      minSelections: data.minSelections ?? 0,
      maxSelections: data.maxSelections ?? 1,
    })
    .returning()
    .get();
}

export function updateModifierGroup(
  db: DrizzleDB,
  tenantId: string,
  groupId: string,
  data: { name?: string; minSelections?: number; maxSelections?: number; sortOrder?: number }
) {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.minSelections !== undefined) updateData.minSelections = data.minSelections;
  if (data.maxSelections !== undefined) updateData.maxSelections = data.maxSelections;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  return db
    .update(modifierGroups)
    .set(updateData)
    .where(
      and(
        eq(modifierGroups.id, groupId),
        eq(modifierGroups.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function deleteModifierGroup(db: DrizzleDB, tenantId: string, groupId: string) {
  return db
    .update(modifierGroups)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(modifierGroups.id, groupId),
        eq(modifierGroups.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

// --- Modifier Option Service ---

export function getModifierOptions(db: DrizzleDB, groupId: string) {
  return db
    .select()
    .from(modifierOptions)
    .where(
      and(
        eq(modifierOptions.groupId, groupId),
        eq(modifierOptions.isActive, 1)
      )
    )
    .orderBy(modifierOptions.sortOrder)
    .all();
}

export function createModifierOption(
  db: DrizzleDB,
  tenantId: string,
  data: { groupId: string; name: string; priceDelta?: number; isDefault?: number }
) {
  // Verify group belongs to tenant
  const group = db
    .select()
    .from(modifierGroups)
    .where(
      and(
        eq(modifierGroups.id, data.groupId),
        eq(modifierGroups.tenantId, tenantId),
        eq(modifierGroups.isActive, 1)
      )
    )
    .get();

  if (!group) {
    return { error: 'Modifier group not found' as const };
  }

  const option = db
    .insert(modifierOptions)
    .values({
      groupId: data.groupId,
      name: data.name,
      priceDelta: data.priceDelta ?? 0,
      isDefault: data.isDefault ?? 0,
    })
    .returning()
    .get();

  return { data: option };
}

export function updateModifierOption(
  db: DrizzleDB,
  tenantId: string,
  optionId: string,
  data: { name?: string; priceDelta?: number; isDefault?: number; sortOrder?: number }
) {
  // Verify option belongs to a group owned by this tenant
  const option = db
    .select({ id: modifierOptions.id, groupId: modifierOptions.groupId })
    .from(modifierOptions)
    .where(eq(modifierOptions.id, optionId))
    .get();

  if (!option) {
    return { error: 'Modifier option not found' as const };
  }

  const group = db
    .select()
    .from(modifierGroups)
    .where(
      and(
        eq(modifierGroups.id, option.groupId),
        eq(modifierGroups.tenantId, tenantId)
      )
    )
    .get();

  if (!group) {
    return { error: 'Modifier option not found' as const };
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.priceDelta !== undefined) updateData.priceDelta = data.priceDelta;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const updated = db
    .update(modifierOptions)
    .set(updateData)
    .where(eq(modifierOptions.id, optionId))
    .returning()
    .get();

  return { data: updated };
}

export function deleteModifierOption(db: DrizzleDB, tenantId: string, optionId: string) {
  // Verify option belongs to a group owned by this tenant
  const option = db
    .select({ id: modifierOptions.id, groupId: modifierOptions.groupId })
    .from(modifierOptions)
    .where(eq(modifierOptions.id, optionId))
    .get();

  if (!option) {
    return { error: 'Modifier option not found' as const };
  }

  const group = db
    .select()
    .from(modifierGroups)
    .where(
      and(
        eq(modifierGroups.id, option.groupId),
        eq(modifierGroups.tenantId, tenantId)
      )
    )
    .get();

  if (!group) {
    return { error: 'Modifier option not found' as const };
  }

  const updated = db
    .update(modifierOptions)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(eq(modifierOptions.id, optionId))
    .returning()
    .get();

  return { data: updated };
}

// --- Item-Modifier Group Links ---

export function getItemModifierGroups(db: DrizzleDB, tenantId: string, menuItemId: string) {
  // Get linked group IDs for this menu item
  const links = db
    .select()
    .from(menuItemModifierGroups)
    .where(eq(menuItemModifierGroups.menuItemId, menuItemId))
    .orderBy(menuItemModifierGroups.sortOrder)
    .all();

  if (links.length === 0) {
    return [];
  }

  const groupIds = links.map((l) => l.modifierGroupId);

  const groups = db
    .select()
    .from(modifierGroups)
    .where(
      and(
        inArray(modifierGroups.id, groupIds),
        eq(modifierGroups.tenantId, tenantId),
        eq(modifierGroups.isActive, 1)
      )
    )
    .all();

  // Preserve link sort order and attach options
  return links
    .map((link) => {
      const group = groups.find((g) => g.id === link.modifierGroupId);
      if (!group) return null;

      const options = db
        .select()
        .from(modifierOptions)
        .where(
          and(
            eq(modifierOptions.groupId, group.id),
            eq(modifierOptions.isActive, 1)
          )
        )
        .orderBy(modifierOptions.sortOrder)
        .all();

      return { ...group, options };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);
}

export function setItemModifierGroups(
  db: DrizzleDB,
  tenantId: string,
  menuItemId: string,
  groupIds: string[]
) {
  // Verify the menu item belongs to this tenant
  const item = db
    .select()
    .from(menuItems)
    .where(
      and(
        eq(menuItems.id, menuItemId),
        eq(menuItems.tenantId, tenantId)
      )
    )
    .get();

  if (!item) {
    return { error: 'Menu item not found' as const };
  }

  // Verify all groups belong to this tenant
  if (groupIds.length > 0) {
    const validGroups = db
      .select({ id: modifierGroups.id })
      .from(modifierGroups)
      .where(
        and(
          inArray(modifierGroups.id, groupIds),
          eq(modifierGroups.tenantId, tenantId),
          eq(modifierGroups.isActive, 1)
        )
      )
      .all();

    if (validGroups.length !== groupIds.length) {
      return { error: 'One or more modifier groups not found' as const };
    }
  }

  // Delete existing links
  db.delete(menuItemModifierGroups)
    .where(eq(menuItemModifierGroups.menuItemId, menuItemId))
    .run();

  // Insert new links with sort order
  const links = groupIds.map((groupId, index) => ({
    menuItemId,
    modifierGroupId: groupId,
    sortOrder: index,
  }));

  if (links.length > 0) {
    db.insert(menuItemModifierGroups).values(links).run();
  }

  return { data: getItemModifierGroups(db, tenantId, menuItemId) };
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

  return { categories: menuByCategory, combos };
}

// --- Promotion Service ---

export function getPromotions(db: DrizzleDB, tenantId: string) {
  const promoList = db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.tenantId, tenantId),
        eq(promotions.isActive, 1)
      )
    )
    .orderBy(desc(promotions.createdAt))
    .all();

  return promoList.map((promo) => {
    const codes = db
      .select()
      .from(promoCodes)
      .where(
        and(
          eq(promoCodes.promotionId, promo.id),
          eq(promoCodes.tenantId, tenantId),
          eq(promoCodes.isActive, 1)
        )
      )
      .all();

    return { ...promo, codes };
  });
}

export function createPromotion(
  db: DrizzleDB,
  tenantId: string,
  data: {
    name: string;
    description?: string;
    type: PromotionType;
    discountValue: number;
    minOrderAmount?: number;
    applicableCategories?: string[];
    startsAt: string;
    endsAt?: string;
    maxUses?: number;
  }
) {
  return db
    .insert(promotions)
    .values({
      tenantId,
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount ?? null,
      applicableCategories: data.applicableCategories
        ? JSON.stringify(data.applicableCategories)
        : null,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      maxUses: data.maxUses ?? null,
    })
    .returning()
    .get();
}

export function updatePromotion(
  db: DrizzleDB,
  tenantId: string,
  promoId: string,
  data: {
    name?: string;
    description?: string;
    type?: PromotionType;
    discountValue?: number;
    minOrderAmount?: number | null;
    applicableCategories?: string[] | null;
    startsAt?: string;
    endsAt?: string | null;
    maxUses?: number | null;
    isActive?: number;
  }
) {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
  if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
  if (data.applicableCategories !== undefined) {
    updateData.applicableCategories = data.applicableCategories
      ? JSON.stringify(data.applicableCategories)
      : null;
  }
  if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
  if (data.endsAt !== undefined) updateData.endsAt = data.endsAt;
  if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return db
    .update(promotions)
    .set(updateData)
    .where(
      and(
        eq(promotions.id, promoId),
        eq(promotions.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function deletePromotion(db: DrizzleDB, tenantId: string, promoId: string) {
  return db
    .update(promotions)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(promotions.id, promoId),
        eq(promotions.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function getPromoCodes(db: DrizzleDB, tenantId: string, promotionId?: string) {
  const conditions = [
    eq(promoCodes.tenantId, tenantId),
    eq(promoCodes.isActive, 1),
  ];
  if (promotionId) {
    conditions.push(eq(promoCodes.promotionId, promotionId));
  }

  return db
    .select()
    .from(promoCodes)
    .where(and(...conditions))
    .all();
}

export function createPromoCode(
  db: DrizzleDB,
  tenantId: string,
  data: { promotionId: string; code: string; usageLimit?: number }
) {
  // Verify promotion exists and belongs to tenant
  const promo = db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.id, data.promotionId),
        eq(promotions.tenantId, tenantId),
        eq(promotions.isActive, 1)
      )
    )
    .get();

  if (!promo) {
    return { error: 'Promotion not found' as const };
  }

  // Check code uniqueness within tenant
  const existing = db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.tenantId, tenantId),
        eq(promoCodes.code, data.code.toUpperCase()),
        eq(promoCodes.isActive, 1)
      )
    )
    .get();

  if (existing) {
    return { error: 'Promo code already exists for this tenant' as const };
  }

  const code = db
    .insert(promoCodes)
    .values({
      tenantId,
      promotionId: data.promotionId,
      code: data.code.toUpperCase(),
      usageLimit: data.usageLimit ?? null,
    })
    .returning()
    .get();

  return { data: code };
}

export function deletePromoCode(db: DrizzleDB, tenantId: string, codeId: string) {
  return db
    .update(promoCodes)
    .set({ isActive: 0 })
    .where(
      and(
        eq(promoCodes.id, codeId),
        eq(promoCodes.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function validatePromoCode(
  db: DrizzleDB,
  tenantId: string,
  code: string
): { data: { promotion: Promotion; promoCode: { id: string; code: string } } } | { error: string } {
  const promoCode = db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.tenantId, tenantId),
        eq(promoCodes.code, code.toUpperCase()),
        eq(promoCodes.isActive, 1)
      )
    )
    .get();

  if (!promoCode) {
    return { error: 'Invalid promo code' };
  }

  // Check usage limit
  if (promoCode.usageLimit !== null && promoCode.usageCount >= promoCode.usageLimit) {
    return { error: 'Promo code usage limit reached' };
  }

  // Get the associated promotion
  const promotion = db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.id, promoCode.promotionId),
        eq(promotions.tenantId, tenantId),
        eq(promotions.isActive, 1)
      )
    )
    .get();

  if (!promotion) {
    return { error: 'Promotion is no longer active' };
  }

  // Check promotion date range
  const now = new Date().toISOString();
  if (promotion.startsAt > now) {
    return { error: 'Promotion has not started yet' };
  }
  if (promotion.endsAt && promotion.endsAt < now) {
    return { error: 'Promotion has expired' };
  }

  // Check promotion max uses
  if (promotion.maxUses !== null && promotion.currentUses >= promotion.maxUses) {
    return { error: 'Promotion usage limit reached' };
  }

  return {
    data: {
      promotion,
      promoCode: { id: promoCode.id, code: promoCode.code },
    },
  };
}

export function applyPromotion(
  promotion: Promotion,
  orderTotal: number,
  categoryIds?: string[]
): number {
  // If promotion is restricted to specific categories, check overlap
  if (promotion.applicableCategories) {
    const applicableIds: string[] = JSON.parse(promotion.applicableCategories);
    if (categoryIds && categoryIds.length > 0) {
      const hasOverlap = categoryIds.some((id) => applicableIds.includes(id));
      if (!hasOverlap) {
        return 0; // No applicable items
      }
    }
  }

  // Check minimum order amount
  if (promotion.minOrderAmount !== null && orderTotal < promotion.minOrderAmount) {
    return 0;
  }

  let discount: number;
  if (promotion.type === 'percentage') {
    discount = orderTotal * (promotion.discountValue / 100);
  } else {
    // fixed_amount
    discount = promotion.discountValue;
  }

  // Never exceed order total
  discount = Math.min(discount, orderTotal);

  // Round to 2 decimal places
  return Math.round(discount * 100) / 100;
}

// --- Combo Deal Service ---

interface CreateComboSlotOption {
  menuItemId: string;
  priceModifier?: number;
  isDefault?: number;
}

interface CreateComboSlot {
  name: string;
  minSelections?: number;
  maxSelections?: number;
  options: CreateComboSlotOption[];
}

interface CreateComboDealData {
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  categoryId?: string;
  slots: CreateComboSlot[];
}

export function getComboDeals(db: DrizzleDB, tenantId: string) {
  const deals = db
    .select()
    .from(comboDeals)
    .where(
      and(
        eq(comboDeals.tenantId, tenantId),
        eq(comboDeals.isActive, 1)
      )
    )
    .orderBy(comboDeals.sortOrder)
    .all();

  return deals.map((deal) => {
    const slots = db
      .select()
      .from(comboSlots)
      .where(eq(comboSlots.comboDealId, deal.id))
      .orderBy(comboSlots.sortOrder)
      .all();

    const slotsWithOptions = slots.map((slot) => {
      const options = db
        .select({
          id: comboSlotOptions.id,
          comboSlotId: comboSlotOptions.comboSlotId,
          menuItemId: comboSlotOptions.menuItemId,
          priceModifier: comboSlotOptions.priceModifier,
          isDefault: comboSlotOptions.isDefault,
          sortOrder: comboSlotOptions.sortOrder,
          menuItemName: menuItems.name,
          menuItemPrice: menuItems.price,
        })
        .from(comboSlotOptions)
        .leftJoin(menuItems, eq(comboSlotOptions.menuItemId, menuItems.id))
        .where(eq(comboSlotOptions.comboSlotId, slot.id))
        .orderBy(comboSlotOptions.sortOrder)
        .all();

      return { ...slot, options };
    });

    return { ...deal, slots: slotsWithOptions };
  });
}

export function createComboDeal(
  db: DrizzleDB,
  tenantId: string,
  data: CreateComboDealData
) {
  // Validate categoryId if provided
  if (data.categoryId) {
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

  // Validate all menuItemIds belong to this tenant
  const allMenuItemIds = data.slots.flatMap((slot) =>
    slot.options.map((opt) => opt.menuItemId)
  );

  if (allMenuItemIds.length > 0) {
    const validItems = db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        and(
          inArray(menuItems.id, allMenuItemIds),
          eq(menuItems.tenantId, tenantId),
          eq(menuItems.isActive, 1)
        )
      )
      .all();

    const validIds = new Set(validItems.map((i) => i.id));
    const invalidIds = allMenuItemIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return { error: `Menu items not found: ${invalidIds.join(', ')}` as const };
    }
  }

  // Create combo deal
  const deal = db
    .insert(comboDeals)
    .values({
      tenantId,
      name: data.name,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      basePrice: data.basePrice,
      categoryId: data.categoryId ?? null,
    })
    .returning()
    .get();

  // Create slots and their options
  const createdSlots = data.slots.map((slotData, slotIndex) => {
    const slot = db
      .insert(comboSlots)
      .values({
        comboDealId: deal.id,
        name: slotData.name,
        sortOrder: slotIndex,
        minSelections: slotData.minSelections ?? 1,
        maxSelections: slotData.maxSelections ?? 1,
      })
      .returning()
      .get();

    const createdOptions = slotData.options.map((optData, optIndex) =>
      db
        .insert(comboSlotOptions)
        .values({
          comboSlotId: slot.id,
          menuItemId: optData.menuItemId,
          priceModifier: optData.priceModifier ?? 0,
          isDefault: optData.isDefault ?? 0,
          sortOrder: optIndex,
        })
        .returning()
        .get()
    );

    return { ...slot, options: createdOptions };
  });

  return { data: { ...deal, slots: createdSlots } };
}

export function updateComboDeal(
  db: DrizzleDB,
  tenantId: string,
  comboId: string,
  data: {
    name?: string;
    description?: string;
    imageUrl?: string;
    basePrice?: number;
    categoryId?: string | null;
    sortOrder?: number;
    isActive?: number;
  }
) {
  // Validate categoryId if provided
  if (data.categoryId) {
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
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = db
    .update(comboDeals)
    .set(updateData)
    .where(
      and(
        eq(comboDeals.id, comboId),
        eq(comboDeals.tenantId, tenantId)
      )
    )
    .returning()
    .get();

  if (!updated) {
    return { error: 'Combo deal not found' as const };
  }

  return { data: updated };
}

export function deleteComboDeal(db: DrizzleDB, tenantId: string, comboId: string) {
  return db
    .update(comboDeals)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(comboDeals.id, comboId),
        eq(comboDeals.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function getPublicCombos(db: DrizzleDB, tenantId: string) {
  const deals = db
    .select()
    .from(comboDeals)
    .where(
      and(
        eq(comboDeals.tenantId, tenantId),
        eq(comboDeals.isActive, 1)
      )
    )
    .orderBy(comboDeals.sortOrder)
    .all();

  return deals.map((deal) => {
    const slots = db
      .select()
      .from(comboSlots)
      .where(eq(comboSlots.comboDealId, deal.id))
      .orderBy(comboSlots.sortOrder)
      .all();

    const slotsWithOptions = slots.map((slot) => {
      const options = db
        .select({
          id: comboSlotOptions.id,
          comboSlotId: comboSlotOptions.comboSlotId,
          menuItemId: comboSlotOptions.menuItemId,
          priceModifier: comboSlotOptions.priceModifier,
          isDefault: comboSlotOptions.isDefault,
          sortOrder: comboSlotOptions.sortOrder,
          menuItemName: menuItems.name,
          menuItemPrice: menuItems.price,
          menuItemDescription: menuItems.description,
          menuItemImageUrl: menuItems.imageUrl,
        })
        .from(comboSlotOptions)
        .leftJoin(menuItems, eq(comboSlotOptions.menuItemId, menuItems.id))
        .where(eq(comboSlotOptions.comboSlotId, slot.id))
        .orderBy(comboSlotOptions.sortOrder)
        .all();

      return { ...slot, options };
    });

    return { ...deal, slots: slotsWithOptions };
  });
}

// --- Order Service ---

interface OrderItemModifier {
  optionId: string;
  name: string;
  price: number;
}

interface CreateOrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifiers?: OrderItemModifier[];
}

interface ComboOrderSelection {
  slotId: string;
  menuItemId: string;
}

interface ComboOrderItem {
  comboDealId: string;
  selections: ComboOrderSelection[];
  quantity: number;
  notes?: string;
}

interface CreateOrderData {
  tableNumber: string;
  sessionId?: string;
  notes?: string;
  items: CreateOrderItem[];
  comboItems?: ComboOrderItem[];
  promoCode?: string;
}

export function createOrder(
  db: DrizzleDB,
  tenantId: string,
  data: CreateOrderData
) {
  const hasRegularItems = data.items.length > 0;
  const hasComboItems = data.comboItems && data.comboItems.length > 0;

  if (!hasRegularItems && !hasComboItems) {
    return { error: 'Order must contain at least one item' as const };
  }

  // Validate and snapshot all regular items
  const resolvedItems: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes: string | null;
    modifiersJson: string | null;
    comboDealId: string | null;
    comboGroupId: string | null;
  }> = [];

  for (const orderItem of data.items) {
    const menuItem = db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.id, orderItem.menuItemId),
          eq(menuItems.tenantId, tenantId),
          eq(menuItems.isActive, 1),
          eq(menuItems.isAvailable, 1)
        )
      )
      .get();

    if (!menuItem) {
      return { error: `Menu item not found or unavailable: ${orderItem.menuItemId}` as const };
    }

    // Validate and snapshot modifiers
    let modifierPriceTotal = 0;
    let modifiersSnapshot: Array<{ name: string; price: number }> | null = null;

    if (orderItem.modifiers && orderItem.modifiers.length > 0) {
      modifiersSnapshot = [];
      for (const mod of orderItem.modifiers) {
        const option = db
          .select()
          .from(modifierOptions)
          .where(
            and(
              eq(modifierOptions.id, mod.optionId),
              eq(modifierOptions.isActive, 1)
            )
          )
          .get();

        if (!option) {
          return { error: `Modifier option not found: ${mod.optionId}` as const };
        }

        // Snapshot from DB, not from client (client values are untrusted)
        modifiersSnapshot.push({
          name: option.name,
          price: option.priceDelta,
        });
        modifierPriceTotal += option.priceDelta;
      }
    }

    resolvedItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price + modifierPriceTotal,
      quantity: orderItem.quantity,
      notes: orderItem.notes ?? null,
      modifiersJson: modifiersSnapshot ? JSON.stringify(modifiersSnapshot) : null,
      comboDealId: null,
      comboGroupId: null,
    });
  }

  // Validate and snapshot combo items
  let comboTotal = 0;

  if (data.comboItems && data.comboItems.length > 0) {
    for (const comboItem of data.comboItems) {
      // Verify combo deal exists and belongs to tenant
      const deal = db
        .select()
        .from(comboDeals)
        .where(
          and(
            eq(comboDeals.id, comboItem.comboDealId),
            eq(comboDeals.tenantId, tenantId),
            eq(comboDeals.isActive, 1)
          )
        )
        .get();

      if (!deal) {
        return { error: `Combo deal not found: ${comboItem.comboDealId}` as const };
      }

      // Get all slots for this combo
      const slots = db
        .select()
        .from(comboSlots)
        .where(eq(comboSlots.comboDealId, deal.id))
        .all();

      const slotMap = new Map(slots.map((s) => [s.id, s]));

      // Validate selections cover all required slots
      const selectionsBySlot = new Map<string, ComboOrderSelection[]>();
      for (const sel of comboItem.selections) {
        const existing = selectionsBySlot.get(sel.slotId) ?? [];
        existing.push(sel);
        selectionsBySlot.set(sel.slotId, existing);
      }

      let comboPriceModifiers = 0;
      const comboGroupId = nanoid();

      for (const slot of slots) {
        const slotSelections = selectionsBySlot.get(slot.id) ?? [];
        if (slotSelections.length < slot.minSelections) {
          return { error: `Slot "${slot.name}" requires at least ${slot.minSelections} selection(s)` as const };
        }
        if (slotSelections.length > slot.maxSelections) {
          return { error: `Slot "${slot.name}" allows at most ${slot.maxSelections} selection(s)` as const };
        }

        // Validate each selection is a valid option for this slot
        for (const sel of slotSelections) {
          const slotOption = db
            .select({
              id: comboSlotOptions.id,
              menuItemId: comboSlotOptions.menuItemId,
              priceModifier: comboSlotOptions.priceModifier,
            })
            .from(comboSlotOptions)
            .where(
              and(
                eq(comboSlotOptions.comboSlotId, slot.id),
                eq(comboSlotOptions.menuItemId, sel.menuItemId)
              )
            )
            .get();

          if (!slotOption) {
            return { error: `Menu item ${sel.menuItemId} is not a valid option for slot "${slot.name}"` as const };
          }

          // Get the menu item for snapshotting
          const menuItem = db
            .select()
            .from(menuItems)
            .where(
              and(
                eq(menuItems.id, sel.menuItemId),
                eq(menuItems.tenantId, tenantId),
                eq(menuItems.isActive, 1)
              )
            )
            .get();

          if (!menuItem) {
            return { error: `Menu item not found: ${sel.menuItemId}` as const };
          }

          comboPriceModifiers += slotOption.priceModifier;

          // Snapshot each selected item as an order item linked to the combo
          resolvedItems.push({
            menuItemId: menuItem.id,
            name: `[${deal.name}] ${menuItem.name}`,
            price: 0, // individual items in a combo are $0; combo price is on the group
            quantity: comboItem.quantity,
            notes: comboItem.notes ?? null,
            modifiersJson: JSON.stringify({
              comboName: deal.name,
              slotName: slot.name,
              priceModifier: slotOption.priceModifier,
            }),
            comboDealId: deal.id,
            comboGroupId,
          });
        }
      }

      // Check for selections referencing non-existent slots
      for (const slotId of selectionsBySlot.keys()) {
        if (!slotMap.has(slotId)) {
          return { error: `Invalid slot ID: ${slotId}` as const };
        }
      }

      const comboUnitPrice = deal.basePrice + comboPriceModifiers;
      comboTotal += comboUnitPrice * comboItem.quantity;
    }
  }

  // Calculate total: regular items + combo items
  const regularTotal = resolvedItems
    .filter((item) => item.comboDealId === null)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const total = regularTotal + comboTotal;

  // Round to 2 decimal places to avoid floating point issues
  const roundedTotal = Math.round(total * 100) / 100;

  // Handle promo code if provided
  let discountAmount = 0;
  let promoCodeId: string | null = null;

  if (data.promoCode) {
    const promoResult = validatePromoCode(db, tenantId, data.promoCode);
    if ('error' in promoResult) {
      return { error: promoResult.error as string };
    }

    const { promotion, promoCode: validCode } = promoResult.data;

    // Collect category IDs from resolved items for category-based filtering
    const categoryIds = resolvedItems
      .filter((item) => item.comboDealId === null)
      .map((item) => {
        const menuItem = db
          .select({ categoryId: menuItems.categoryId })
          .from(menuItems)
          .where(eq(menuItems.id, item.menuItemId))
          .get();
        return menuItem?.categoryId;
      })
      .filter((id): id is string => id !== undefined);

    const uniqueCategoryIds = [...new Set(categoryIds)];

    discountAmount = applyPromotion(promotion, roundedTotal, uniqueCategoryIds);

    if (discountAmount > 0) {
      promoCodeId = validCode.id;

      // Atomically increment promo code usage count
      db.update(promoCodes)
        .set({ usageCount: sql`${promoCodes.usageCount} + 1` })
        .where(eq(promoCodes.id, validCode.id))
        .run();

      // Atomically increment promotion current uses
      db.update(promotions)
        .set({
          currentUses: sql`${promotions.currentUses} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(promotions.id, promotion.id))
        .run();
    }
  }

  const finalTotal = Math.round((roundedTotal - discountAmount) * 100) / 100;

  // Create order
  const orderId = nanoid();
  const order = db
    .insert(orders)
    .values({
      id: orderId,
      tenantId,
      sessionId: data.sessionId ?? null,
      tableNumber: data.tableNumber,
      notes: data.notes ?? null,
      total: finalTotal,
      discountAmount,
      promoCodeId,
    })
    .returning()
    .get();

  // Create order items (regular + combo)
  const createdItems = resolvedItems.map((item) =>
    db
      .insert(orderItems)
      .values({
        orderId: order.id,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
        modifiersJson: item.modifiersJson,
        comboDealId: item.comboDealId,
        comboGroupId: item.comboGroupId,
      })
      .returning()
      .get()
  );

  return { data: { ...order, items: createdItems } };
}

export function getOrder(db: DrizzleDB, tenantId: string, orderId: string) {
  const order = db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.tenantId, tenantId)
      )
    )
    .get();

  if (!order) {
    return undefined;
  }

  const items = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .all();

  return { ...order, items };
}

export function getOrders(
  db: DrizzleDB,
  tenantId: string,
  filters?: { status?: string; tableNumber?: string }
) {
  const conditions = [eq(orders.tenantId, tenantId)];

  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status as OrderStatus));
  }
  if (filters?.tableNumber) {
    conditions.push(eq(orders.tableNumber, filters.tableNumber));
  }

  const orderList = db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .all();

  return orderList.map((order) => {
    const items = db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .all();

    return { ...order, items };
  });
}

export function updateOrderStatus(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  status: OrderStatus
) {
  const updated = db
    .update(orders)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.tenantId, tenantId)
      )
    )
    .returning()
    .get();

  if (!updated) {
    return undefined;
  }

  const items = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, updated.id))
    .all();

  return { ...updated, items };
}
