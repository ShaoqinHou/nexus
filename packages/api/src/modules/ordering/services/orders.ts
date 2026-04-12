import { eq, and, or, gte, lte, desc, inArray, sql, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { MODIFIABLE_ORDER_STATUSES } from '@nexus/shared';
import type { OrderItemStatus, PaymentStatus } from '@nexus/shared';
import {
  tenants,
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
import type { OrderStatus, PaymentMethod } from '../../../db/schema.js';
import { validatePromoCode, applyPromotion } from './promotions.js';
import { upsertTableStatus } from './tables.js';

// --- Order Service ---

interface OrderItemModifier {
  optionId: string;
  name: string;
  price: number;
}

export interface CreateOrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifiers?: OrderItemModifier[];
}

interface ComboSelectionModifier {
  optionId: string;
}

interface ComboOrderSelection {
  slotId: string;
  menuItemId: string;
  modifiers?: ComboSelectionModifier[];
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
    allergens: string | null;
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

    // Sold-out check
    if (menuItem.isSoldOut) {
      // Auto-clear if soldOutUntil has passed
      if (menuItem.soldOutUntil && new Date(menuItem.soldOutUntil) < new Date()) {
        db.update(menuItems)
          .set({ isSoldOut: 0, soldOutUntil: null, updatedAt: new Date().toISOString() })
          .where(eq(menuItems.id, menuItem.id))
          .run();
      } else {
        return { error: `Item '${menuItem.name}' is currently sold out` as const };
      }
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
      allergens: menuItem.allergens ?? null,
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

          // Sold-out check for combo items
          if (menuItem.isSoldOut) {
            if (menuItem.soldOutUntil && new Date(menuItem.soldOutUntil) < new Date()) {
              db.update(menuItems)
                .set({ isSoldOut: 0, soldOutUntil: null, updatedAt: new Date().toISOString() })
                .where(eq(menuItems.id, menuItem.id))
                .run();
            } else {
              return { error: `Item '${menuItem.name}' is currently sold out` as const };
            }
          }

          comboPriceModifiers += slotOption.priceModifier;

          // Validate and snapshot modifiers for this combo selection
          let selModifierPriceTotal = 0;
          let selModifiersSnapshot: Array<{ name: string; price: number }> | null = null;

          if (sel.modifiers && sel.modifiers.length > 0) {
            selModifiersSnapshot = [];
            for (const mod of sel.modifiers) {
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
              selModifiersSnapshot.push({
                name: option.name,
                price: option.priceDelta,
              });
              selModifierPriceTotal += option.priceDelta;
            }
          }

          comboPriceModifiers += selModifierPriceTotal;

          // Snapshot each selected item as an order item linked to the combo
          resolvedItems.push({
            menuItemId: menuItem.id,
            name: `[${deal.name}] ${menuItem.name}`,
            price: 0, // individual items in a combo are $0; combo price is on the group
            allergens: menuItem.allergens ?? null,
            quantity: comboItem.quantity,
            notes: comboItem.notes ?? null,
            modifiersJson: JSON.stringify({
              comboName: deal.name,
              slotName: slot.name,
              priceModifier: slotOption.priceModifier,
              ...(selModifiersSnapshot ? { itemModifiers: selModifiersSnapshot } : {}),
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

  const subtotalAfterDiscount = Math.round((roundedTotal - discountAmount) * 100) / 100;

  // Calculate tax from tenant settings
  let taxAmount = 0;
  let finalTotal = subtotalAfterDiscount;

  const tenant = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (tenant?.settings) {
    try {
      const settings = JSON.parse(tenant.settings) as { taxRate?: number; taxInclusive?: boolean };
      const taxRate = settings.taxRate ?? 0;
      if (taxRate > 0) {
        if (settings.taxInclusive) {
          // Prices already include tax — extract tax component for display
          taxAmount = subtotalAfterDiscount - (subtotalAfterDiscount / (1 + taxRate / 100));
          finalTotal = subtotalAfterDiscount; // total stays the same
        } else {
          // Tax added on top
          taxAmount = subtotalAfterDiscount * (taxRate / 100);
          finalTotal = subtotalAfterDiscount + taxAmount;
        }
        taxAmount = Math.round(taxAmount * 100) / 100;
        finalTotal = Math.round(finalTotal * 100) / 100;
      }
    } catch {
      // If settings parsing fails, proceed without tax
    }
  }

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
      taxAmount,
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
        allergens: item.allergens,
        modifiersJson: item.modifiersJson,
        comboDealId: item.comboDealId,
        comboGroupId: item.comboGroupId,
      })
      .returning()
      .get()
  );

  // Auto-update table status to 'occupied' on new order
  upsertTableStatus(db, tenantId, data.tableNumber, 'occupied');

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
  options?: { status?: string; tableNumber?: string; page?: number; limit?: number }
) {
  const pageSize = options?.limit ?? 50;
  const pageNum = options?.page ?? 1;
  const offset = (pageNum - 1) * pageSize;

  const conditions = [eq(orders.tenantId, tenantId)];

  if (options?.status) {
    conditions.push(eq(orders.status, options.status as OrderStatus));
  }
  if (options?.tableNumber) {
    conditions.push(eq(orders.tableNumber, options.tableNumber));
  }

  const whereClause = and(...conditions);

  // Get total count for pagination metadata
  const totalResult = db
    .select({ total: count() })
    .from(orders)
    .where(whereClause)
    .get();
  const total = totalResult?.total ?? 0;

  const orderList = db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const data = orderList.map((order) => {
    const items = db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .all();

    return { ...order, items };
  });

  return { data, total, page: pageNum, limit: pageSize };
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

  // Auto table status: delivered + paid → needs_cleaning
  if (status === 'delivered' && updated.paymentStatus === 'paid') {
    upsertTableStatus(db, tenantId, updated.tableNumber, 'needs_cleaning');
  }

  const items = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, updated.id))
    .all();

  return { ...updated, items };
}

// --- Order Modification Service Functions ---

/**
 * Helper to recalculate order total from active (non-cancelled) items.
 * Preserves any discount that was already applied.
 */
function recalculateOrderTotal(db: DrizzleDB, orderId: string): number {
  const items = db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.orderId, orderId),
        or(
          eq(orderItems.status, 'active'),
          eq(orderItems.status, 'cancel_requested')
        )
      )
    )
    .all();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Preserve existing discount — read it from the order
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  const discount = order?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discount);

  return Math.round(total * 100) / 100;
}

/**
 * Add items to an existing order (pending/confirmed/preparing).
 * Validates items the same way createOrder does, snapshots prices,
 * inserts new orderItems, and updates the order total.
 */
export function addItemsToOrder(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  items: CreateOrderItem[],
) {
  if (items.length === 0) {
    return { error: 'At least one item is required' as const };
  }

  // Validate order exists, belongs to tenant, and is modifiable
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
    return { error: 'Order not found' as const };
  }

  if (!(MODIFIABLE_ORDER_STATUSES as readonly string[]).includes(order.status)) {
    return { error: `Cannot modify order in '${order.status}' status` as const };
  }

  // Guard: cannot modify paid/refunded orders
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
    return { error: 'Cannot modify a paid order' as const };
  }

  // Validate and snapshot all items (same logic as createOrder for regular items)
  const resolvedItems: Array<{
    menuItemId: string;
    name: string;
    price: number;
    allergens: string | null;
    quantity: number;
    notes: string | null;
    modifiersJson: string | null;
  }> = [];

  for (const orderItem of items) {
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

    // Sold-out check
    if (menuItem.isSoldOut) {
      if (menuItem.soldOutUntil && new Date(menuItem.soldOutUntil) < new Date()) {
        db.update(menuItems)
          .set({ isSoldOut: 0, soldOutUntil: null, updatedAt: new Date().toISOString() })
          .where(eq(menuItems.id, menuItem.id))
          .run();
      } else {
        return { error: `Item '${menuItem.name}' is currently sold out` as const };
      }
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
      allergens: menuItem.allergens ?? null,
      quantity: orderItem.quantity,
      notes: orderItem.notes ?? null,
      modifiersJson: modifiersSnapshot ? JSON.stringify(modifiersSnapshot) : null,
    });
  }

  // Insert new order items
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
        allergens: item.allergens,
        modifiersJson: item.modifiersJson,
        status: 'active',
      })
      .returning()
      .get()
  );

  // Recalculate and update order total
  const newTotal = recalculateOrderTotal(db, order.id);
  db.update(orders)
    .set({
      total: newTotal,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, order.id))
    .run();

  // Return the full updated order
  const allItems = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .all();

  const updatedOrder = db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .get()!;

  return { data: { ...updatedOrder, items: allItems } };
}

/**
 * Customer requests cancellation of specific order items.
 * Marks the items as 'cancel_requested'. Staff must approve or reject.
 */
export function requestItemCancellation(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  orderItemIds: string[],
) {
  if (orderItemIds.length === 0) {
    return { error: 'At least one item ID is required' as const };
  }

  // Validate order exists and is modifiable
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
    return { error: 'Order not found' as const };
  }

  if (!(MODIFIABLE_ORDER_STATUSES as readonly string[]).includes(order.status)) {
    return { error: `Cannot modify order in '${order.status}' status` as const };
  }

  // Guard: cannot cancel items on paid/refunded orders
  if (order.paymentStatus !== 'unpaid') {
    return { error: 'Cannot modify a paid order' as const };
  }

  // Validate all items belong to this order and are currently active
  for (const itemId of orderItemIds) {
    const item = db
      .select()
      .from(orderItems)
      .where(
        and(
          eq(orderItems.id, itemId),
          eq(orderItems.orderId, orderId)
        )
      )
      .get();

    if (!item) {
      return { error: `Order item not found: ${itemId}` as const };
    }

    if (item.status !== 'active') {
      return { error: `Item '${item.name}' is already ${item.status}` as const };
    }
  }

  // Mark items as cancel_requested
  for (const itemId of orderItemIds) {
    db.update(orderItems)
      .set({ status: 'cancel_requested' as OrderItemStatus })
      .where(eq(orderItems.id, itemId))
      .run();
  }

  // Update order updatedAt
  db.update(orders)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(orders.id, order.id))
    .run();

  // Return updated order
  const updatedOrder = db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .get()!;

  const allItems = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .all();

  return { data: { ...updatedOrder, items: allItems } };
}

/**
 * Staff approves or rejects a cancellation request for a single order item.
 * - approve: marks item as 'cancelled', recalculates order total
 * - reject: marks item back to 'active'
 */
export function handleCancellationRequest(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  orderItemId: string,
  action: 'approve' | 'reject',
) {
  // Validate order exists and belongs to tenant
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
    return { error: 'Order not found' as const };
  }

  // Validate item exists, belongs to order, and is cancel_requested
  const item = db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.id, orderItemId),
        eq(orderItems.orderId, orderId)
      )
    )
    .get();

  if (!item) {
    return { error: 'Order item not found' as const };
  }

  if (item.status !== 'cancel_requested') {
    return { error: `Item is not pending cancellation (current status: ${item.status})` as const };
  }

  // Apply the action
  const newStatus: OrderItemStatus = action === 'approve' ? 'cancelled' : 'active';

  db.update(orderItems)
    .set({ status: newStatus })
    .where(eq(orderItems.id, orderItemId))
    .run();

  // Recalculate total if approved (cancelled items no longer count)
  if (action === 'approve') {
    const newTotal = recalculateOrderTotal(db, order.id);
    db.update(orders)
      .set({
        total: newTotal,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, order.id))
      .run();
  } else {
    db.update(orders)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(orders.id, order.id))
      .run();
  }

  // Return updated order
  const updatedOrder = db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .get()!;

  const allItems = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .all();

  return { data: { ...updatedOrder, items: allItems } };
}

/**
 * Update payment status of an order (owner/manager only).
 */
export function updatePaymentStatus(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: PaymentMethod,
) {
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
    return { error: 'Order not found' as const };
  }

  const updateData: Record<string, unknown> = {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };
  if (paymentMethod !== undefined) {
    updateData.paymentMethod = paymentMethod;
  }

  const updated = db
    .update(orders)
    .set(updateData)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.tenantId, tenantId)
      )
    )
    .returning()
    .get();

  if (!updated) {
    return { error: 'Failed to update payment status' as const };
  }

  // Auto table status: delivered + paid → needs_cleaning
  if (paymentStatus === 'paid' && updated.status === 'delivered') {
    upsertTableStatus(db, tenantId, updated.tableNumber, 'needs_cleaning');
  }

  const items = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, updated.id))
    .all();

  return { data: { ...updated, items } };
}

// --- Staff Notes ---

/**
 * Update staff-only notes on an order.
 */
export function updateStaffNotes(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  staffNotes: string,
) {
  const updated = db
    .update(orders)
    .set({
      staffNotes,
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

/**
 * Update notes on an individual order item (customer-facing).
 * Only allowed while order is in a modifiable status.
 */
export function updateItemNotes(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  itemId: string,
  notes: string,
) {
  // Validate order exists and belongs to tenant
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
    return { error: 'Order not found' as const };
  }

  if (!(MODIFIABLE_ORDER_STATUSES as readonly string[]).includes(order.status)) {
    return { error: `Cannot modify order in '${order.status}' status` as const };
  }

  // Validate item belongs to this order
  const item = db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.id, itemId),
        eq(orderItems.orderId, orderId)
      )
    )
    .get();

  if (!item) {
    return { error: 'Order item not found' as const };
  }

  // Update the notes
  const updated = db
    .update(orderItems)
    .set({ notes: notes || null })
    .where(eq(orderItems.id, itemId))
    .returning()
    .get();

  return { data: updated };
}

// --- KDS Item Completion ---

/**
 * Toggle completion status of an individual order item (KDS use).
 */
export function toggleItemCompletion(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  itemId: string,
  completed: boolean,
) {
  // Validate order belongs to tenant
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

  const updated = db
    .update(orderItems)
    .set({
      completedAt: completed ? new Date().toISOString() : null,
    })
    .where(
      and(
        eq(orderItems.id, itemId),
        eq(orderItems.orderId, orderId)
      )
    )
    .returning()
    .get();

  return updated;
}

// --- Price Override / Comp ---

/**
 * Apply a manager discount override to an order.
 * Recalculates the total: original subtotal - discountAmount - discountOverride + taxAmount
 */
export function applyDiscountOverride(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  staffId: string,
  amount: number,
  reason: string,
) {
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

  // Recalculate total: compute original subtotal from active items
  const activeItems = db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.orderId, orderId),
        or(
          eq(orderItems.status, 'active'),
          eq(orderItems.status, 'cancel_requested')
        )
      )
    )
    .all();

  const subtotal = activeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = order.discountAmount ?? 0;
  const taxAmount = order.taxAmount ?? 0;
  const newTotal = Math.max(0, Math.round((subtotal - discountAmount - amount + taxAmount) * 100) / 100);

  const updated = db
    .update(orders)
    .set({
      discountOverride: amount,
      overrideReason: reason,
      overrideBy: staffId,
      total: newTotal,
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

// --- Sold Out Toggle ---

/**
 * Toggle sold-out status of a menu item.
 */
export function toggleSoldOut(
  db: DrizzleDB,
  tenantId: string,
  itemId: string,
  isSoldOut: boolean,
  soldOutUntil?: string,
) {
  const updated = db
    .update(menuItems)
    .set({
      isSoldOut: isSoldOut ? 1 : 0,
      soldOutUntil: isSoldOut ? (soldOutUntil ?? null) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(menuItems.id, itemId),
        eq(menuItems.tenantId, tenantId)
      )
    )
    .returning()
    .get();

  return updated;
}

// --- Export Service ---

export interface OrderExportRow {
  date: string;
  orderId: string;
  tableNumber: string;
  status: string;
  paymentStatus: string;
  items: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Fetch orders for CSV export within an inclusive date range.
 * startDate / endDate are YYYY-MM-DD strings (compared against DATE(createdAt)).
 */
export function getOrdersForExport(
  db: DrizzleDB,
  tenantId: string,
  startDate: string,
  endDate: string,
): OrderExportRow[] {
  const conditions = [
    eq(orders.tenantId, tenantId),
    gte(sql`DATE(${orders.createdAt})`, startDate),
    lte(sql`DATE(${orders.createdAt})`, endDate),
  ];

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

    const itemNames = items.map((i) => i.name).join('; ');
    const subtotal = (order.total ?? 0) - (order.discountAmount ?? 0) - (order.taxAmount ?? 0);

    return {
      date: order.createdAt.split('T')[0],
      orderId: order.id,
      tableNumber: order.tableNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: itemNames,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round((order.discountAmount ?? 0) * 100) / 100,
      tax: Math.round((order.taxAmount ?? 0) * 100) / 100,
      total: Math.round((order.total ?? 0) * 100) / 100,
    };
  });
}
