import { eq, and, or, gte, desc, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  menuItems,
  modifierOptions,
  comboDeals,
  comboSlots,
  comboSlotOptions,
  promotions,
  promoCodes,
  orders,
  orderItems,
} from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';
import type { OrderStatus } from '../../../db/schema.js';
import { validatePromoCode, applyPromotion } from './promotions.js';

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

/**
 * Kitchen display orders: active orders (pending/confirmed/preparing/ready)
 * plus recently delivered/cancelled (within the last 10 minutes) so kitchen
 * staff can see what just went out.
 */
export function getKitchenOrders(db: DrizzleDB, tenantId: string) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];
  const terminalStatuses: OrderStatus[] = ['delivered', 'cancelled'];

  const orderList = db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        or(
          inArray(orders.status, activeStatuses),
          and(
            inArray(orders.status, terminalStatuses),
            gte(orders.updatedAt, tenMinutesAgo)
          )
        )
      )
    )
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
