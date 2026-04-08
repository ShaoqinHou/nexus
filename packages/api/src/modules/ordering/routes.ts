import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setCookie, getCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../../middleware/auth.js';
import { customerSessions, ORDER_STATUSES } from '../../db/schema.js';
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
  getPublicMenu,
  createOrder,
  getOrder,
  getOrders,
  updateOrderStatus,
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
});

const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
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
  groupIds: z.array(z.string().min(1)),
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
    .min(1, 'At least one item is required'),
});

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
      const { groupIds } = c.req.valid('json');
      const result = setItemModifierGroups(db, tenantId, itemId, groupIds);
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ data: result.data });
    }
  );

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

  // Place order — creates session if needed
  router.post('/orders', zValidator('json', placeOrderSchema), (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');

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
        secure: false, // Set to true in production
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

  return router;
}
