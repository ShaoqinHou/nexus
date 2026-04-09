import { Hono, type MiddlewareHandler } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setCookie, getCookie } from 'hono/cookie';
import { streamSSE } from 'hono/streaming';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import { authMiddleware, JWT_SECRET } from '../../middleware/auth.js';
import { customerSessions, staff, ORDER_STATUSES, PROMOTION_TYPES, ORDER_ITEM_STATUSES } from '../../db/schema.js';
import type { DrizzleDB } from '../../db/client.js';
import type { AuthEnv, TenantEnv } from '../../lib/types.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
  getItemModifierGroups,
  setItemModifierGroups,
  getComboDeals,
  createComboDeal,
  updateComboDeal,
  deleteComboDeal,
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  createPromoCode,
  deletePromoCode,
  validatePromoCode,
  getPublicMenu,
  createOrder,
  getOrder,
  getOrders,
  getKitchenOrders,
  updateOrderStatus,
  addItemsToOrder,
  requestItemCancellation,
  handleCancellationRequest,
  getDailyRevenue,
  getTopItems,
  getPeakHours,
  getOrderStats,
  getPromoStats,
  getStatusBreakdown,
} from './service.js';

// --- Validation Schemas ---

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.number().int().min(0).max(1).optional(),
});

const createMenuItemSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  imageUrl: z.string().url().optional(),
  tags: z.string().optional(),
});

const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.string().optional(),
  isAvailable: z.number().int().min(0).max(1).optional(),
  sortOrder: z.number().int().optional(),
  categoryId: z.string().min(1).optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const createModifierGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
});

const updateModifierGroupSchema = z.object({
  name: z.string().min(1).optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

const createModifierOptionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  priceDelta: z.number().optional(),
  isDefault: z.number().int().min(0).max(1).optional(),
});

const updateModifierOptionSchema = z.object({
  name: z.string().min(1).optional(),
  priceDelta: z.number().optional(),
  isDefault: z.number().int().min(0).max(1).optional(),
  sortOrder: z.number().int().optional(),
});

const setItemModifierGroupsSchema = z.object({
  groupIds: z.array(z.string().min(1)).optional(),
  groups: z.array(z.object({
    groupId: z.string().min(1),
    priceOverrides: z.record(z.object({ priceDelta: z.number() })).optional(),
  })).optional(),
}).refine(
  (data) => data.groupIds !== undefined || data.groups !== undefined,
  { message: 'Either groupIds or groups must be provided' }
);

// --- Combo Deal Schemas ---

const comboSlotOptionSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID is required'),
  priceModifier: z.number().optional(),
  isDefault: z.number().int().min(0).max(1).optional(),
});

const comboSlotSchema = z.object({
  name: z.string().min(1, 'Slot name is required'),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  options: z.array(comboSlotOptionSchema).min(1, 'At least one option is required'),
});

const createComboDealSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  basePrice: z.number().positive('Base price must be positive'),
  categoryId: z.string().min(1).optional(),
  slots: z.array(comboSlotSchema).min(1, 'At least one slot is required'),
});

const updateComboDealSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  basePrice: z.number().positive().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.number().int().min(0).max(1).optional(),
  slots: z.array(comboSlotSchema).min(1, 'At least one slot is required').optional(),
});

// --- Promotion Schemas ---

const createPromotionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(PROMOTION_TYPES),
  discountValue: z.number().positive('Discount value must be positive'),
  minOrderAmount: z.number().positive().optional(),
  applicableCategories: z.array(z.string().min(1)).optional(),
  startsAt: z.string().min(1, 'Start date is required'),
  endsAt: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
});

const updatePromotionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(PROMOTION_TYPES).optional(),
  discountValue: z.number().positive().optional(),
  minOrderAmount: z.number().positive().nullable().optional(),
  applicableCategories: z.array(z.string().min(1)).nullable().optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  isActive: z.number().int().min(0).max(1).optional(),
});

const createPromoCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  usageLimit: z.number().int().positive().optional(),
});

const validatePromoCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

// --- Order Modification Schemas ---

const addItemsSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'Menu item ID is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
        notes: z.string().optional(),
        modifiers: z
          .array(
            z.object({
              optionId: z.string().min(1, 'Option ID is required'),
              name: z.string().min(1),
              price: z.number(),
            })
          )
          .optional(),
      })
    )
    .min(1, 'At least one item is required'),
});

const cancelItemsSchema = z.object({
  orderItemIds: z.array(z.string().min(1)).min(1, 'At least one item ID is required'),
});

const handleCancellationSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

// --- Order Schema ---

const comboOrderItemSchema = z.object({
  comboDealId: z.string().min(1, 'Combo deal ID is required'),
  selections: z.array(
    z.object({
      slotId: z.string().min(1, 'Slot ID is required'),
      menuItemId: z.string().min(1, 'Menu item ID is required'),
      modifiers: z.array(
        z.object({
          optionId: z.string().min(1, 'Option ID is required'),
        })
      ).optional(),
    })
  ).min(1, 'At least one selection is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
});

const placeOrderSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required'),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'Menu item ID is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
        notes: z.string().optional(),
        modifiers: z
          .array(
            z.object({
              optionId: z.string().min(1, 'Option ID is required'),
              name: z.string().min(1),
              price: z.number(),
            })
          )
          .optional(),
      })
    )
    .default([]),
  comboItems: z.array(comboOrderItemSchema).optional(),
  promoCode: z.string().min(1).optional(),
}).refine(
  (data) => data.items.length > 0 || (data.comboItems && data.comboItems.length > 0),
  { message: 'Order must contain at least one regular item or combo item' }
);

// --- Staff Ordering Routes ---

export function staffOrderingRoutes(db: DrizzleDB) {
  const router = new Hono<AuthEnv>();

  // All staff routes require authentication
  router.use('*', authMiddleware(db));

  // --- Categories ---

  router.get('/categories', (c) => {
    const tenantId = c.var.tenantId;
    const categories = getCategories(db, tenantId);
    return c.json({ data: categories });
  });

  router.post('/categories', zValidator('json', createCategorySchema), (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const category = createCategory(db, tenantId, body);
    return c.json({ data: category }, 201);
  });

  router.put('/categories/:id', zValidator('json', updateCategorySchema), (c) => {
    const tenantId = c.var.tenantId;
    const categoryId = c.req.param('id');
    const body = c.req.valid('json');
    const category = updateCategory(db, tenantId, categoryId, body);
    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }
    return c.json({ data: category });
  });

  router.delete('/categories/:id', (c) => {
    const tenantId = c.var.tenantId;
    const categoryId = c.req.param('id');
    const category = deleteCategory(db, tenantId, categoryId);
    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }
    return c.json({ data: category });
  });

  // --- Menu Items ---

  router.get('/items', (c) => {
    const tenantId = c.var.tenantId;
    const categoryId = c.req.query('categoryId');
    const items = getMenuItems(db, tenantId, categoryId);
    return c.json({ data: items });
  });

  router.post('/items', zValidator('json', createMenuItemSchema), (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const result = createMenuItem(db, tenantId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }
    return c.json({ data: result.data }, 201);
  });

  router.put('/items/:id', zValidator('json', updateMenuItemSchema), (c) => {
    const tenantId = c.var.tenantId;
    const itemId = c.req.param('id');
    const body = c.req.valid('json');
    const result = updateMenuItem(db, tenantId, itemId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }
    return c.json({ data: result.data });
  });

  router.delete('/items/:id', (c) => {
    const tenantId = c.var.tenantId;
    const itemId = c.req.param('id');
    const item = deleteMenuItem(db, tenantId, itemId);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }
    return c.json({ data: item });
  });

  // --- Modifier Groups ---

  router.get('/modifiers', (c) => {
    const tenantId = c.var.tenantId;
    const groups = getModifierGroups(db, tenantId);
    return c.json({ data: groups });
  });

  router.post('/modifiers', zValidator('json', createModifierGroupSchema), (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const group = createModifierGroup(db, tenantId, body);
    return c.json({ data: group }, 201);
  });

  router.put('/modifiers/:id', zValidator('json', updateModifierGroupSchema), (c) => {
    const tenantId = c.var.tenantId;
    const groupId = c.req.param('id');
    const body = c.req.valid('json');
    const group = updateModifierGroup(db, tenantId, groupId, body);
    if (!group) {
      return c.json({ error: 'Modifier group not found' }, 404);
    }
    return c.json({ data: group });
  });

  router.delete('/modifiers/:id', (c) => {
    const tenantId = c.var.tenantId;
    const groupId = c.req.param('id');
    const group = deleteModifierGroup(db, tenantId, groupId);
    if (!group) {
      return c.json({ error: 'Modifier group not found' }, 404);
    }
    return c.json({ data: group });
  });

  // --- Modifier Options ---

  router.post(
    '/modifiers/:id/options',
    zValidator('json', createModifierOptionSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const groupId = c.req.param('id');
      const body = c.req.valid('json');
      const result = createModifierOption(db, tenantId, { ...body, groupId });
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ data: result.data }, 201);
    }
  );

  router.put(
    '/modifiers/options/:id',
    zValidator('json', updateModifierOptionSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const optionId = c.req.param('id');
      const body = c.req.valid('json');
      const result = updateModifierOption(db, tenantId, optionId, body);
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ data: result.data });
    }
  );

  router.delete('/modifiers/options/:id', (c) => {
    const tenantId = c.var.tenantId;
    const optionId = c.req.param('id');
    const result = deleteModifierOption(db, tenantId, optionId);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }
    return c.json({ data: result.data });
  });

  // --- Item Modifier Group Links ---

  router.get('/items/:id/modifiers', (c) => {
    const tenantId = c.var.tenantId;
    const itemId = c.req.param('id');
    const groups = getItemModifierGroups(db, tenantId, itemId);
    return c.json({ data: groups });
  });

  router.put(
    '/items/:id/modifiers',
    zValidator('json', setItemModifierGroupsSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const itemId = c.req.param('id');
      const body = c.req.valid('json');
      // Support both legacy groupIds[] and new groups[] with price overrides
      const groupsInput = body.groups ?? (body.groupIds ?? []).map((id: string) => ({ groupId: id }));
      const result = setItemModifierGroups(db, tenantId, itemId, groupsInput);
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ data: result.data });
    }
  );

  // --- Combo Deals ---

  router.get('/combos', (c) => {
    const tenantId = c.var.tenantId;
    const combos = getComboDeals(db, tenantId);
    return c.json({ data: combos });
  });

  router.post('/combos', zValidator('json', createComboDealSchema), (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const result = createComboDeal(db, tenantId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ data: result.data }, 201);
  });

  router.put('/combos/:id', zValidator('json', updateComboDealSchema), (c) => {
    const tenantId = c.var.tenantId;
    const comboId = c.req.param('id');
    const body = c.req.valid('json');
    const result = updateComboDeal(db, tenantId, comboId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }
    return c.json({ data: result.data });
  });

  router.delete('/combos/:id', (c) => {
    const tenantId = c.var.tenantId;
    const comboId = c.req.param('id');
    const combo = deleteComboDeal(db, tenantId, comboId);
    if (!combo) {
      return c.json({ error: 'Combo deal not found' }, 404);
    }
    return c.json({ data: combo });
  });

  // --- Promotions ---

  router.get('/promotions', (c) => {
    const tenantId = c.var.tenantId;
    const promos = getPromotions(db, tenantId);
    return c.json({ data: promos });
  });

  router.post('/promotions', zValidator('json', createPromotionSchema), (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const promo = createPromotion(db, tenantId, body);
    return c.json({ data: promo }, 201);
  });

  router.put('/promotions/:id', zValidator('json', updatePromotionSchema), (c) => {
    const tenantId = c.var.tenantId;
    const promoId = c.req.param('id');
    const body = c.req.valid('json');
    const promo = updatePromotion(db, tenantId, promoId, body);
    if (!promo) {
      return c.json({ error: 'Promotion not found' }, 404);
    }
    return c.json({ data: promo });
  });

  router.delete('/promotions/:id', (c) => {
    const tenantId = c.var.tenantId;
    const promoId = c.req.param('id');
    const promo = deletePromotion(db, tenantId, promoId);
    if (!promo) {
      return c.json({ error: 'Promotion not found' }, 404);
    }
    return c.json({ data: promo });
  });

  // --- Promo Codes ---

  router.post(
    '/promotions/:id/codes',
    zValidator('json', createPromoCodeSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const promotionId = c.req.param('id');
      const body = c.req.valid('json');
      const result = createPromoCode(db, tenantId, {
        promotionId,
        code: body.code,
        usageLimit: body.usageLimit,
      });
      if ('error' in result) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.data }, 201);
    }
  );

  router.delete('/promotions/codes/:id', (c) => {
    const tenantId = c.var.tenantId;
    const codeId = c.req.param('id');
    const code = deletePromoCode(db, tenantId, codeId);
    if (!code) {
      return c.json({ error: 'Promo code not found' }, 404);
    }
    return c.json({ data: code });
  });

  // --- Orders (Staff) ---

  router.get('/orders', (c) => {
    const tenantId = c.var.tenantId;
    const status = c.req.query('status');
    const tableNumber = c.req.query('tableNumber');
    const orderList = getOrders(db, tenantId, { status, tableNumber });
    return c.json({ data: orderList });
  });

  router.get('/orders/:id', (c) => {
    const tenantId = c.var.tenantId;
    const orderId = c.req.param('id');
    const order = getOrder(db, tenantId, orderId);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    return c.json({ data: order });
  });

  router.patch(
    '/orders/:id/status',
    zValidator('json', updateOrderStatusSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const { status } = c.req.valid('json');
      const order = updateOrderStatus(db, tenantId, orderId, status);
      if (!order) {
        return c.json({ error: 'Order not found' }, 404);
      }
      return c.json({ data: order });
    }
  );

  // --- Order Modifications (Staff) ---

  // Staff can add items to an order
  router.post(
    '/orders/:id/items',
    zValidator('json', addItemsSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const { items } = c.req.valid('json');
      const result = addItemsToOrder(db, tenantId, orderId, items);
      if ('error' in result) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.data });
    }
  );

  // Staff handles cancellation request (approve / reject)
  router.patch(
    '/orders/:id/items/:itemId',
    zValidator('json', handleCancellationSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const itemId = c.req.param('itemId');
      const { action } = c.req.valid('json');
      const result = handleCancellationRequest(db, tenantId, orderId, itemId, action);
      if ('error' in result) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.data });
    }
  );

  // --- Analytics (owner/manager only) ---

  const analyticsGuard: MiddlewareHandler<AuthEnv> = async (c, next) => {
    const user = c.var.user;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Analytics requires owner or manager role' }, 403);
    }
    await next();
  };
  router.use('/analytics/*', analyticsGuard);

  router.get('/analytics/revenue', (c) => {
    const tenantId = c.var.tenantId;
    const days = Number(c.req.query('days') || '30');
    const data = getDailyRevenue(db, tenantId, days);
    return c.json({ data });
  });

  router.get('/analytics/top-items', (c) => {
    const tenantId = c.var.tenantId;
    const limit = Number(c.req.query('limit') || '10');
    const data = getTopItems(db, tenantId, limit);
    return c.json({ data });
  });

  router.get('/analytics/peak-hours', (c) => {
    const tenantId = c.var.tenantId;
    const days = Number(c.req.query('days') || '7');
    const data = getPeakHours(db, tenantId, days);
    return c.json({ data });
  });

  router.get('/analytics/stats', (c) => {
    const tenantId = c.var.tenantId;
    const data = getOrderStats(db, tenantId);
    return c.json({ data });
  });

  router.get('/analytics/promos', (c) => {
    const tenantId = c.var.tenantId;
    const data = getPromoStats(db, tenantId);
    return c.json({ data });
  });

  router.get('/analytics/status-breakdown', (c) => {
    const tenantId = c.var.tenantId;
    const data = getStatusBreakdown(db, tenantId);
    return c.json({ data });
  });

  // Kitchen stream moved to kitchenStreamRoutes() — mounted without authMiddleware

  return router;
}

// --- Kitchen SSE Stream (separate, no authMiddleware — handles its own JWT) ---
export function kitchenStreamRoutes(db: DrizzleDB) {
  const router = new Hono<TenantEnv>();

  router.get('/stream', (c) => {
    const tenantId = c.var.tenantId;

    // Authenticate via query param (EventSource can't set headers)
    const token = c.req.query('token');
    if (!token) {
      return c.json({ error: 'Token query parameter required' }, 401);
    }

    let payload: unknown;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('staffId' in payload) ||
      !('tenantId' in payload)
    ) {
      return c.json({ error: 'Invalid token payload' }, 401);
    }

    const jwtTenantId = (payload as { tenantId: string }).tenantId;
    if (jwtTenantId !== tenantId) {
      return c.json({ error: 'Token does not match tenant' }, 401);
    }

    // Verify staff member exists and is active
    const staffMember = db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.id, (payload as { staffId: string }).staffId),
          eq(staff.tenantId, tenantId),
          eq(staff.isActive, 1)
        )
      )
      .get();

    if (!staffMember) {
      return c.json({ error: 'Staff member not found or inactive' }, 401);
    }

    return streamSSE(c, async (stream) => {
      let id = 0;

      // Send initial state
      const initialOrders = getKitchenOrders(db, tenantId);
      await stream.writeSSE({
        data: JSON.stringify({ type: 'init', orders: initialOrders }),
        event: 'orders',
        id: String(id++),
      });

      // Poll for changes every 3 seconds, timeout after 60 minutes
      const MAX_AGE_MS = 60 * 60 * 1000;
      const startTime = Date.now();
      while (Date.now() - startTime < MAX_AGE_MS) {
        await stream.sleep(3000);
        const updatedOrders = getKitchenOrders(db, tenantId);
        await stream.writeSSE({
          data: JSON.stringify({ type: 'update', orders: updatedOrders }),
          event: 'orders',
          id: String(id++),
        });
      }
      // Connection closes — client will auto-reconnect
    });
  });

  return router;
}

// --- Customer Ordering Routes ---

export function customerOrderingRoutes(db: DrizzleDB) {
  const router = new Hono<TenantEnv>();

  // Public menu — no session required
  router.get('/menu', (c) => {
    const tenantId = c.var.tenantId;
    const menu = getPublicMenu(db, tenantId);
    return c.json({ data: menu });
  });

  // Validate promo code — public, no session required
  // TODO: Add rate limiting to prevent promo code brute force
  router.post('/validate-promo', zValidator('json', validatePromoCodeSchema), (c) => {
    const tenantId = c.var.tenantId;
    const { code } = c.req.valid('json');
    const result = validatePromoCode(db, tenantId, code);
    if ('error' in result) {
      return c.json({ error: result.error }, 400);
    }
    const { promotion, promoCode } = result.data;
    return c.json({
      data: {
        code: promoCode.code,
        promotionName: promotion.name,
        description: promotion.description,
        type: promotion.type,
        discountValue: promotion.discountValue,
        minOrderAmount: promotion.minOrderAmount,
        applicableCategories: promotion.applicableCategories
          ? JSON.parse(promotion.applicableCategories)
          : null,
      },
    });
  });

  // Place order — creates session if needed
  router.post('/orders', zValidator('json', placeOrderSchema), (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');

    // Check operating hours
    const tenant = c.var.tenant;
    try {
      const settings = tenant.settings ? JSON.parse(tenant.settings) : {};
      const hours = settings.operatingHours as Array<{ day: number; open: string; close: string }> | undefined;
      if (hours && hours.length > 0) {
        const now = new Date();
        const day = now.getDay();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todayHours = hours.find((h) => h.day === day);
        if (!todayHours || time < todayHours.open || time >= todayHours.close) {
          return c.json({ error: 'Restaurant is currently closed' }, 400);
        }
      }
    } catch {
      // If settings parsing fails, allow the order (don't block on config errors)
    }

    // Get or create customer session
    let sessionId: string | undefined;
    const existingToken = getCookie(c, 'session_token');

    if (existingToken) {
      const existingSession = db
        .select()
        .from(customerSessions)
        .where(
          and(
            eq(customerSessions.sessionToken, existingToken),
            eq(customerSessions.tenantId, tenantId)
          )
        )
        .get();

      if (existingSession && new Date(existingSession.expiresAt) > new Date()) {
        sessionId = existingSession.id;
      }
    }

    // Create new session if none exists
    if (!sessionId) {
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const session = db
        .insert(customerSessions)
        .values({
          tenantId,
          tableNumber: body.tableNumber,
          sessionToken: token,
          expiresAt,
        })
        .returning()
        .get();

      sessionId = session.id;

      setCookie(c, 'session_token', token, {
        httpOnly: true,
        secure: process.env.PORT !== '3001',
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60, // 24 hours in seconds
        path: '/',
      });
    }

    const result = createOrder(db, tenantId, {
      tableNumber: body.tableNumber,
      sessionId,
      notes: body.notes,
      items: body.items,
      comboItems: body.comboItems,
      promoCode: body.promoCode,
    });

    if ('error' in result) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ data: result.data }, 201);
  });

  // Get order by ID — for status polling
  router.get('/orders/:id', (c) => {
    const tenantId = c.var.tenantId;
    const orderId = c.req.param('id');
    const order = getOrder(db, tenantId, orderId);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    return c.json({ data: order });
  });

  // --- Order Modifications (Customer) ---

  // Customer adds items to an existing order
  router.post(
    '/orders/:id/items',
    zValidator('json', addItemsSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const { items } = c.req.valid('json');
      const result = addItemsToOrder(db, tenantId, orderId, items);
      if ('error' in result) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.data });
    }
  );

  // Customer requests cancellation of specific items
  router.post(
    '/orders/:id/cancel-items',
    zValidator('json', cancelItemsSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const { orderItemIds } = c.req.valid('json');
      const result = requestItemCancellation(db, tenantId, orderId, orderItemIds);
      if ('error' in result) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.data });
    }
  );

  return router;
}
