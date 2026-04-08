import { eq, and, desc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  menuCategories,
  menuItems,
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
  orders,
  orderItems,
} from '../../db/schema.js';
import type { DrizzleDB } from '../../db/client.js';
import type { OrderStatus } from '../../db/schema.js';

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

  return categories.map((category) => {
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

interface CreateOrderData {
  tableNumber: string;
  sessionId?: string;
  notes?: string;
  items: CreateOrderItem[];
}

export function createOrder(
  db: DrizzleDB,
  tenantId: string,
  data: CreateOrderData
) {
  if (data.items.length === 0) {
    return { error: 'Order must contain at least one item' as const };
  }

  // Validate and snapshot all items
  const resolvedItems: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes: string | null;
    modifiersJson: string | null;
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
    });
  }

  // Calculate total: price already includes modifier deltas
  const total = resolvedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Round to 2 decimal places to avoid floating point issues
  const roundedTotal = Math.round(total * 100) / 100;

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
      total: roundedTotal,
    })
    .returning()
    .get();

  // Create order items
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
