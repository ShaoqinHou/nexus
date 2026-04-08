import { eq, and, inArray } from 'drizzle-orm';
import {
  menuCategories,
  menuItems,
  comboDeals,
  comboSlots,
  comboSlotOptions,
} from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';

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
