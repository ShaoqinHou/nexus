import { eq, and, inArray } from 'drizzle-orm';
import {
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
  menuItems,
} from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';

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

  if (groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);

  // Reverse lookup: which menu items use each group. Single join query
  // scoped to this tenant via menuItems.tenantId.
  const usageRows = db
    .select({
      modifierGroupId: menuItemModifierGroups.modifierGroupId,
      menuItemId: menuItemModifierGroups.menuItemId,
      menuItemName: menuItems.name,
      isActive: menuItems.isActive,
      priceOverrides: menuItemModifierGroups.priceOverrides,
    })
    .from(menuItemModifierGroups)
    .innerJoin(menuItems, eq(menuItems.id, menuItemModifierGroups.menuItemId))
    .where(
      and(
        inArray(menuItemModifierGroups.modifierGroupId, groupIds),
        eq(menuItems.tenantId, tenantId),
        eq(menuItems.isActive, 1)
      )
    )
    .all();

  const usageByGroup = new Map<
    string,
    { id: string; name: string; hasPriceOverride: boolean }[]
  >();
  for (const row of usageRows) {
    const overrides = row.priceOverrides;
    const hasPriceOverride =
      overrides !== null && overrides !== '{}' && overrides !== '';
    const arr = usageByGroup.get(row.modifierGroupId);
    const entry = {
      id: row.menuItemId,
      name: row.menuItemName,
      hasPriceOverride,
    };
    if (arr) {
      arr.push(entry);
    } else {
      usageByGroup.set(row.modifierGroupId, [entry]);
    }
  }

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

    const usedByItems = usageByGroup.get(group.id) ?? [];

    return {
      ...group,
      options,
      usageCount: usedByItems.length,
      usedByItems,
    };
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

export function getModifierOptions(db: DrizzleDB, tenantId: string, groupId: string) {
  // Verify group belongs to tenant before returning options
  const group = db
    .select()
    .from(modifierGroups)
    .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.tenantId, tenantId)))
    .get();
  if (!group) return [];

  return db
    .select()
    .from(modifierOptions)
    .where(and(eq(modifierOptions.groupId, groupId), eq(modifierOptions.isActive, 1)))
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

  // Preserve link sort order and attach options (with per-item price overrides applied)
  return links
    .map((link) => {
      const group = groups.find((g) => g.id === link.modifierGroupId);
      if (!group) return null;

      const overrides: Record<string, { priceDelta: number }> | null =
        link.priceOverrides ? JSON.parse(link.priceOverrides) : null;

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
        .all()
        .map((option) => ({
          ...option,
          priceDelta: overrides?.[option.id]?.priceDelta ?? option.priceDelta,
        }));

      return { ...group, options };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);
}

interface SetItemModifierGroupInput {
  groupId: string;
  priceOverrides?: Record<string, { priceDelta: number }>;
}

export function setItemModifierGroups(
  db: DrizzleDB,
  tenantId: string,
  menuItemId: string,
  groups: string[] | SetItemModifierGroupInput[]
) {
  // Normalize: accept either string[] (backward compat) or SetItemModifierGroupInput[]
  const normalized: SetItemModifierGroupInput[] =
    groups.length === 0
      ? []
      : typeof groups[0] === 'string'
        ? (groups as string[]).map((id) => ({ groupId: id }))
        : (groups as SetItemModifierGroupInput[]);

  const groupIds = normalized.map((g) => g.groupId);

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

  // Insert new links with sort order and optional price overrides
  const links = normalized.map((g, index) => ({
    menuItemId,
    modifierGroupId: g.groupId,
    sortOrder: index,
    priceOverrides: g.priceOverrides ? JSON.stringify(g.priceOverrides) : null,
  }));

  if (links.length > 0) {
    db.insert(menuItemModifierGroups).values(links).run();
  }

  return { data: getItemModifierGroups(db, tenantId, menuItemId) };
}
