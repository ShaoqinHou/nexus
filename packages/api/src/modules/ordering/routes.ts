import { Hono, type MiddlewareHandler } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setCookie, getCookie } from 'hono/cookie';
import { streamSSE } from 'hono/streaming';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import { translate, translateBatch } from '../../lib/translate.js';
import { translationsRoutes } from './routes/translations.js';
import { authMiddleware, JWT_SECRET } from '../../middleware/auth.js';
import { sessionMiddleware } from '../../middleware/session.js';
import { customerSessions, staff, ORDER_STATUSES, PROMOTION_TYPES, ORDER_ITEM_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS, TABLE_STATUSES, WAITER_CALL_TYPES } from '../../db/schema.js';
import type { DrizzleDB } from '../../db/client.js';
import type { AuthEnv, TenantEnv, CustomerEnv } from '../../lib/types.js';
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
  updatePaymentStatus,
  updateStaffNotes,
  updateItemNotes,
  toggleItemCompletion,
  applyDiscountOverride,
  toggleSoldOut,
  getDailyRevenue,
  getTopItems,
  getPeakHours,
  getOrderStats,
  getPromoStats,
  getStatusBreakdown,
  getDailySummary,
  getOrdersForExport,
  getOrdersBySessionId,
  getTableStatuses,
  upsertTableStatus,
  getUnacknowledgedWaiterCalls,
  acknowledgeWaiterCall,
  createWaiterCall,
  submitFeedback,
  getFeedback,
  getFeedbackSummary,
  addPayment,
  getOrderPayments,
  removePayment,
  setTranslation,
  getTranslations,
  getTranslationsForLocale,
  autoTranslateEntity,
  translateForKitchen,
  getTenantPrimaryLocale,
} from './service.js';

// --- Validation Schemas ---

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  station: z.enum(['all', 'kitchen', 'bar']).optional(),
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
  allergens: z.string().optional(),
});

const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.string().optional(),
  allergens: z.string().optional(),
  isAvailable: z.number().int().min(0).max(1).optional(),
  sortOrder: z.number().int().optional(),
  categoryId: z.string().min(1).optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
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

// --- Split Payment Schema ---

const addPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(PAYMENT_METHODS),
  paidBy: z.string().max(100).optional(),
});

// --- Translation Schemas ---

const translateSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  targetLocale: z.string().min(2, 'Target locale is required'),
  context: z.string().optional(),
});

const translateBatchSchema = z.object({
  targetLocale: z.string().min(2, 'Target locale is required'),
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

const updateItemNotesSchema = z.object({
  notes: z.string().max(500, 'Notes must be 500 characters or less'),
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

  router.post('/categories', zValidator('json', createCategorySchema), async (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const category = createCategory(db, tenantId, body);

    // Auto-translate category
    try {
      const fields: Record<string, string> = {};
      if (category.name) fields.name = category.name;
      if (category.description) fields.description = category.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(db, tenantId, 'menu_category', category.id, fields, 'menu category');
      }
    } catch (err) {
      console.error('Auto-translate failed for category:', err instanceof Error ? err.message : err);
    }

    return c.json({ data: category }, 201);
  });

  router.put('/categories/:id', zValidator('json', updateCategorySchema), async (c) => {
    const tenantId = c.var.tenantId;
    const categoryId = c.req.param('id');
    const body = c.req.valid('json');
    const category = updateCategory(db, tenantId, categoryId, body);
    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // Auto-translate if name or description changed
    try {
      const fields: Record<string, string> = {};
      if (body.name && category.name) fields.name = category.name;
      if (body.description !== undefined && category.description) fields.description = category.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(db, tenantId, 'menu_category', category.id, fields, 'menu category');
      }
    } catch (err) {
      console.error('Auto-translate failed for category:', err instanceof Error ? err.message : err);
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

  router.post('/items', zValidator('json', createMenuItemSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const result = createMenuItem(db, tenantId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }

    // Auto-translate (fire-and-forget — don't block response)
    try {
      const fields: Record<string, string> = {};
      if (result.data.name) fields.name = result.data.name;
      if (result.data.description) fields.description = result.data.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(db, tenantId, 'menu_item', result.data.id, fields, 'menu item');
      }
    } catch (err) {
      console.error('Auto-translate failed for menu item:', err instanceof Error ? err.message : err);
    }

    return c.json({ data: result.data }, 201);
  });

  router.put('/items/:id', zValidator('json', updateMenuItemSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const itemId = c.req.param('id');
    const body = c.req.valid('json');
    const result = updateMenuItem(db, tenantId, itemId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }

    // Auto-translate if name or description changed
    try {
      const fields: Record<string, string> = {};
      if (body.name && result.data.name) fields.name = result.data.name;
      if (body.description !== undefined && result.data.description) fields.description = result.data.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(db, tenantId, 'menu_item', result.data.id, fields, 'menu item');
      }
    } catch (err) {
      console.error('Auto-translate failed for menu item:', err instanceof Error ? err.message : err);
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

  router.post('/modifiers', zValidator('json', createModifierGroupSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const group = createModifierGroup(db, tenantId, body);

    // Auto-translate (fire-and-forget)
    try {
      if (group.name) {
        await autoTranslateEntity(
          db,
          tenantId,
          'modifier_group',
          group.id,
          { name: group.name },
          'modifier group',
        );
      }
    } catch (err) {
      console.error(
        'Auto-translate failed for modifier group:',
        err instanceof Error ? err.message : err,
      );
    }

    return c.json({ data: group }, 201);
  });

  router.put('/modifiers/:id', zValidator('json', updateModifierGroupSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const groupId = c.req.param('id');
    const body = c.req.valid('json');
    const group = updateModifierGroup(db, tenantId, groupId, body);
    if (!group) {
      return c.json({ error: 'Modifier group not found' }, 404);
    }

    // Auto-translate if name changed
    try {
      if (body.name && group.name) {
        await autoTranslateEntity(
          db,
          tenantId,
          'modifier_group',
          group.id,
          { name: group.name },
          'modifier group',
        );
      }
    } catch (err) {
      console.error(
        'Auto-translate failed for modifier group:',
        err instanceof Error ? err.message : err,
      );
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
    async (c) => {
      const tenantId = c.var.tenantId;
      const groupId = c.req.param('id');
      const body = c.req.valid('json');
      const result = createModifierOption(db, tenantId, { ...body, groupId });
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }

      // Auto-translate (fire-and-forget)
      try {
        if (result.data.name) {
          await autoTranslateEntity(
            db,
            tenantId,
            'modifier_option',
            result.data.id,
            { name: result.data.name },
            'modifier option',
          );
        }
      } catch (err) {
        console.error(
          'Auto-translate failed for modifier option:',
          err instanceof Error ? err.message : err,
        );
      }

      return c.json({ data: result.data }, 201);
    }
  );

  router.put(
    '/modifiers/options/:id',
    zValidator('json', updateModifierOptionSchema),
    async (c) => {
      const tenantId = c.var.tenantId;
      const optionId = c.req.param('id');
      const body = c.req.valid('json');
      const result = updateModifierOption(db, tenantId, optionId, body);
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }

      // Auto-translate if name changed
      try {
        if (body.name && result.data.name) {
          await autoTranslateEntity(
            db,
            tenantId,
            'modifier_option',
            result.data.id,
            { name: result.data.name },
            'modifier option',
          );
        }
      } catch (err) {
        console.error(
          'Auto-translate failed for modifier option:',
          err instanceof Error ? err.message : err,
        );
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

  router.post('/combos', zValidator('json', createComboDealSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const result = createComboDeal(db, tenantId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 400);
    }

    // Auto-translate (fire-and-forget). Combo slots are NOT translated in this pass.
    try {
      const fields: Record<string, string> = {};
      if (result.data.name) fields.name = result.data.name;
      if (result.data.description) fields.description = result.data.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(
          db,
          tenantId,
          'combo_deal',
          result.data.id,
          fields,
          'combo deal',
        );
      }
    } catch (err) {
      console.error(
        'Auto-translate failed for combo deal:',
        err instanceof Error ? err.message : err,
      );
    }

    return c.json({ data: result.data }, 201);
  });

  router.put('/combos/:id', zValidator('json', updateComboDealSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const comboId = c.req.param('id');
    const body = c.req.valid('json');
    const result = updateComboDeal(db, tenantId, comboId, body);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }

    // Auto-translate if name or description changed
    try {
      const fields: Record<string, string> = {};
      if (body.name && result.data.name) fields.name = result.data.name;
      if (body.description !== undefined && result.data.description)
        fields.description = result.data.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(
          db,
          tenantId,
          'combo_deal',
          result.data.id,
          fields,
          'combo deal',
        );
      }
    } catch (err) {
      console.error(
        'Auto-translate failed for combo deal:',
        err instanceof Error ? err.message : err,
      );
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

  router.post('/promotions', zValidator('json', createPromotionSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const promo = createPromotion(db, tenantId, body);

    // Auto-translate (fire-and-forget)
    try {
      const fields: Record<string, string> = {};
      if (promo.name) fields.name = promo.name;
      if (promo.description) fields.description = promo.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(db, tenantId, 'promotion', promo.id, fields, 'promotion');
      }
    } catch (err) {
      console.error(
        'Auto-translate failed for promotion:',
        err instanceof Error ? err.message : err,
      );
    }

    return c.json({ data: promo }, 201);
  });

  router.put('/promotions/:id', zValidator('json', updatePromotionSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const promoId = c.req.param('id');
    const body = c.req.valid('json');
    const promo = updatePromotion(db, tenantId, promoId, body);
    if (!promo) {
      return c.json({ error: 'Promotion not found' }, 404);
    }

    // Auto-translate if name or description changed
    try {
      const fields: Record<string, string> = {};
      if (body.name && promo.name) fields.name = promo.name;
      if (body.description !== undefined && promo.description)
        fields.description = promo.description;
      if (Object.keys(fields).length > 0) {
        await autoTranslateEntity(db, tenantId, 'promotion', promo.id, fields, 'promotion');
      }
    } catch (err) {
      console.error(
        'Auto-translate failed for promotion:',
        err instanceof Error ? err.message : err,
      );
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
    const pageRaw = c.req.query('page');
    const limitRaw = c.req.query('limit');
    const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10)) : 1;
    const limit = limitRaw ? Math.min(200, Math.max(1, parseInt(limitRaw, 10))) : 50;
    const result = getOrders(db, tenantId, { status, tableNumber, page, limit });
    return c.json(result);
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

  // --- Payment Status (owner/manager only) ---

  router.patch(
    '/orders/:id/payment',
    zValidator('json', updatePaymentStatusSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const user = c.var.user;
      if (user.role !== 'owner' && user.role !== 'manager') {
        return c.json({ error: 'Only owner or manager can update payment status' }, 403);
      }
      const orderId = c.req.param('id');
      const { paymentStatus, paymentMethod } = c.req.valid('json');
      const result = updatePaymentStatus(db, tenantId, orderId, paymentStatus, paymentMethod);
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ data: result.data });
    }
  );

  // --- Split Payments (Staff) ---

  // Add a partial payment to an order (any staff)
  router.post(
    '/orders/:id/payments',
    zValidator('json', addPaymentSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const { amount, method, paidBy } = c.req.valid('json');
      const result = addPayment(db, tenantId, orderId, amount, method, paidBy);
      if ('error' in result) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.data }, 201);
    }
  );

  // List payments for an order (any staff)
  router.get('/orders/:id/payments', (c) => {
    const tenantId = c.var.tenantId;
    const orderId = c.req.param('id');
    const payments = getOrderPayments(db, tenantId, orderId);
    return c.json({ data: payments });
  });

  // Remove a payment (owner/manager only)
  router.delete(
    '/orders/:id/payments/:paymentId',
    (c) => {
      const tenantId = c.var.tenantId;
      const user = c.var.user;
      if (user.role !== 'owner' && user.role !== 'manager') {
        return c.json({ error: 'Only owner or manager can remove payments' }, 403);
      }
      const paymentId = c.req.param('paymentId');
      const result = removePayment(db, tenantId, paymentId);
      if ('error' in result) {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ data: result.data });
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
    const daysParam = c.req.query('days');
    const days = daysParam !== undefined ? Number(daysParam) : undefined;
    const data = getTopItems(db, tenantId, limit, days);
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

  router.get('/analytics/daily-summary', (c) => {
    const tenantId = c.var.tenantId;
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];
    const data = getDailySummary(db, tenantId, date);
    return c.json({ data });
  });

  // --- Orders CSV Export (owner/manager only, covered by analyticsGuard) ---

  router.get('/orders/export', zValidator('query', z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
    format: z.literal('csv').optional(),
  })), (c) => {
    const user = c.var.user;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Only owner or manager can export orders' }, 403);
    }

    const tenantId = c.var.tenantId;
    const { startDate, endDate } = c.req.valid('query');

    const rows = getOrdersForExport(db, tenantId, startDate, endDate);

    const escapeCell = (value: string | number): string => {
      const str = String(value);
      // Quote fields that contain commas, quotes, or newlines
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'Date,Order ID,Table,Status,Payment Status,Items,Subtotal,Discount,Tax,Total';
    const dataLines = rows.map((row) =>
      [
        escapeCell(row.date),
        escapeCell(row.orderId),
        escapeCell(row.tableNumber),
        escapeCell(row.status),
        escapeCell(row.paymentStatus),
        escapeCell(row.items),
        row.subtotal.toFixed(2),
        row.discount.toFixed(2),
        row.tax.toFixed(2),
        row.total.toFixed(2),
      ].join(',')
    );

    const csv = [header, ...dataLines].join('\n');
    const filename = `orders-${startDate}-to-${endDate}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });

  // --- Table Status ---

  const updateTableStatusSchema = z.object({
    status: z.enum(TABLE_STATUSES),
  });

  router.get('/tables', (c) => {
    const tenantId = c.var.tenantId;
    const tables = getTableStatuses(db, tenantId);
    return c.json({ data: tables });
  });

  router.patch(
    '/tables/:tableNumber',
    zValidator('json', updateTableStatusSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const tableNumber = c.req.param('tableNumber');
      const { status } = c.req.valid('json');
      const row = upsertTableStatus(db, tenantId, tableNumber, status);
      return c.json({ data: row });
    },
  );

  // --- Staff Notes ---

  const updateStaffNotesSchema = z.object({
    staffNotes: z.string(),
  });

  router.patch(
    '/orders/:id/notes',
    zValidator('json', updateStaffNotesSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const { staffNotes } = c.req.valid('json');
      const order = updateStaffNotes(db, tenantId, orderId, staffNotes);
      if (!order) {
        return c.json({ error: 'Order not found' }, 404);
      }
      return c.json({ data: order });
    }
  );

  // --- KDS Item Completion ---

  const toggleItemCompletionSchema = z.object({
    completed: z.boolean(),
  });

  router.patch(
    '/orders/:id/items/:itemId/complete',
    zValidator('json', toggleItemCompletionSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('id');
      const itemId = c.req.param('itemId');
      const { completed } = c.req.valid('json');
      const item = toggleItemCompletion(db, tenantId, orderId, itemId, completed);
      if (!item) {
        return c.json({ error: 'Order or item not found' }, 404);
      }
      return c.json({ data: item });
    }
  );

  // --- Sold Out Toggle (owner/manager only) ---

  const toggleSoldOutSchema = z.object({
    isSoldOut: z.boolean(),
    soldOutUntil: z.string().optional(),
  });

  router.patch(
    '/menu/items/:id/sold-out',
    zValidator('json', toggleSoldOutSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const user = c.var.user;
      if (user.role !== 'owner' && user.role !== 'manager') {
        return c.json({ error: 'Only owner or manager can toggle sold-out status' }, 403);
      }
      const itemId = c.req.param('id');
      const { isSoldOut, soldOutUntil } = c.req.valid('json');
      const item = toggleSoldOut(db, tenantId, itemId, isSoldOut, soldOutUntil);
      if (!item) {
        return c.json({ error: 'Menu item not found' }, 404);
      }
      return c.json({ data: item });
    }
  );

  // --- Price Override / Comp (owner/manager only) ---

  const discountOverrideSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    reason: z.string().min(1, 'Reason is required'),
  });

  router.post(
    '/orders/:id/override',
    zValidator('json', discountOverrideSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const user = c.var.user;
      if (user.role !== 'owner' && user.role !== 'manager') {
        return c.json({ error: 'Only owner or manager can apply discount overrides' }, 403);
      }
      const orderId = c.req.param('id');
      const { amount, reason } = c.req.valid('json');
      const order = applyDiscountOverride(db, tenantId, orderId, user.id, amount, reason);
      if (!order) {
        return c.json({ error: 'Order not found' }, 404);
      }
      return c.json({ data: order });
    }
  );

  // --- Feedback (staff: read, owner/manager only) ---

  router.get('/feedback', (c) => {
    const tenantId = c.var.tenantId;
    const user = c.var.user;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Only owner or manager can view feedback' }, 403);
    }
    const pageRaw = c.req.query('page');
    const limitRaw = c.req.query('limit');
    const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10)) : 1;
    const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10))) : 20;
    const result = getFeedback(db, tenantId, page, limit);
    return c.json(result);
  });

  router.get('/feedback/summary', (c) => {
    const tenantId = c.var.tenantId;
    const user = c.var.user;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Only owner or manager can view feedback summary' }, 403);
    }
    const daysRaw = c.req.query('days');
    const days = daysRaw ? parseInt(daysRaw, 10) : undefined;
    const result = getFeedbackSummary(db, tenantId, days);
    return c.json({ data: result });
  });

  // --- Translation (staff) ---

  // On-demand single text translation (any staff)
  router.post('/translate', zValidator('json', translateSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const body = c.req.valid('json');
    const sourceLocale = getTenantPrimaryLocale(db, tenantId);
    try {
      const translation = await translate({
        text: body.text,
        targetLocale: body.targetLocale,
        context: body.context || 'restaurant menu content',
        sourceLocale,
      });
      return c.json({ data: { translation } });
    } catch (error) {
      console.error('Translation failed:', error instanceof Error ? error.message : error);
      return c.json({ error: 'Translation failed' }, 500);
    }
  });

  // Batch translate all menu items/categories for a locale (owner/manager only)
  router.post('/translate/batch', zValidator('json', translateBatchSchema), async (c) => {
    const tenantId = c.var.tenantId;
    const user = c.var.user;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Only owner or manager can batch translate' }, 403);
    }

    const { targetLocale } = c.req.valid('json');
    const sourceLocale = getTenantPrimaryLocale(db, tenantId);
    let translatedCount = 0;

    try {
      // Collect ALL translatable texts into one batch (1-2 API calls instead of 30+)
      const batchItems: { key: string; text: string; context: string; entityType: string; entityId: string; field: string }[] = [];

      const categories = getCategories(db, tenantId);
      for (const category of categories) {
        for (const field of ['name', 'description'] as const) {
          const text = category[field];
          if (!text || !text.trim()) continue;
          batchItems.push({
            key: `cat:${category.id}:${field}`,
            text,
            context: `restaurant menu category ${field}`,
            entityType: 'menu_category',
            entityId: category.id,
            field,
          });
        }
      }

      const items = getMenuItems(db, tenantId);
      for (const item of items) {
        for (const field of ['name', 'description'] as const) {
          const text = item[field];
          if (!text || !text.trim()) continue;
          batchItems.push({
            key: `item:${item.id}:${field}`,
            text,
            context: `restaurant menu item ${field}`,
            entityType: 'menu_item',
            entityId: item.id,
            field,
          });
        }
      }

      if (batchItems.length === 0) {
        return c.json({ data: { count: 0 } });
      }

      // Send ALL texts in one translateBatch call (packs into 1-2 API requests)
      const results = await translateBatch(
        batchItems.map((b) => ({ key: b.key, text: b.text, context: b.context })),
        targetLocale,
        sourceLocale,
      );

      // Store results
      for (const item of batchItems) {
        const translated = results.get(item.key);
        if (translated && translated !== item.text) {
          setTranslation(db, tenantId, item.entityType, item.entityId, targetLocale, item.field, translated, 'auto');
          translatedCount++;
        }
      }

      return c.json({ data: { count: translatedCount } });
    } catch (error) {
      console.error('Batch translation failed:', error instanceof Error ? error.message : error);
      return c.json({ error: 'Batch translation failed' }, 500);
    }
  });

  // --- Generic content translations (mounted sub-router) ---
  // Handles all entity types: menu_item, menu_category, modifier_group,
  // modifier_option, promotion, combo_deal, combo_slot. See routes/translations.ts.
  router.route('/translations', translationsRoutes(db));

  // --- Waiter Calls (staff: read + acknowledge) ---

  router.get('/waiter-calls', (c) => {
    const tenantId = c.var.tenantId;
    const calls = getUnacknowledgedWaiterCalls(db, tenantId);
    return c.json({ data: calls });
  });

  router.patch('/waiter-calls/:id/acknowledge', (c) => {
    const tenantId = c.var.tenantId;
    const callId = c.req.param('id');
    const call = acknowledgeWaiterCall(db, tenantId, callId);
    if (!call) {
      return c.json({ error: 'Waiter call not found' }, 404);
    }
    return c.json({ data: call });
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

    // Check if tenant uses pre-pay model (kitchen only sees paid orders)
    let isPrePay = false;
    try {
      const tenant = c.var.tenant;
      const settings = tenant.settings ? JSON.parse(tenant.settings) : {};
      isPrePay = settings.paymentModel === 'pre_pay';
    } catch {
      // If settings parsing fails, default to post-pay (show all orders)
    }

    const filterOrders = (allOrders: ReturnType<typeof getKitchenOrders>) => {
      if (!isPrePay) return allOrders;
      return allOrders.filter((o) => o.paymentStatus !== 'unpaid');
    };

    return streamSSE(c, async (stream) => {
      let id = 0;

      // Send initial state
      const initialOrders = filterOrders(getKitchenOrders(db, tenantId));
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
        const updatedOrders = filterOrders(getKitchenOrders(db, tenantId));
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

    // Determine locale from query param or Accept-Language header
    let locale = c.req.query('lang');
    if (!locale) {
      const acceptLang = c.req.header('Accept-Language');
      if (acceptLang) {
        // Parse primary language from Accept-Language (e.g., "zh-CN,zh;q=0.9,en;q=0.8" -> "zh")
        const primary = acceptLang.split(',')[0]?.trim().split('-')[0]?.trim();
        if (primary && primary.length >= 2) {
          locale = primary;
        }
      }
    }

    const menu = getPublicMenu(db, tenantId, locale);
    return c.json({ data: menu });
  });

  // Validate promo code — public, no session required
  // Rate limiting: max 5 attempts per IP per minute
  const promoAttempts = new Map<string, { count: number; resetAt: number }>();
  router.post('/validate-promo', zValidator('json', validatePromoCodeSchema), (c) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();
    const entry = promoAttempts.get(ip);
    if (entry && now < entry.resetAt) {
      if (entry.count >= 5) {
        return c.json({ error: 'Too many attempts. Please try again in a minute.' }, 429);
      }
      entry.count++;
    } else {
      promoAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    }
    // Cleanup old entries every 100 requests
    if (promoAttempts.size > 100) {
      for (const [k, v] of promoAttempts) { if (now > v.resetAt) promoAttempts.delete(k); }
    }
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

  // Session-based order history — returns orders associated with the customer's session
  router.get('/session/orders', sessionMiddleware(db) as unknown as MiddlewareHandler<TenantEnv>, (c) => {
    const tenantId = c.var.tenantId;
    const session = (c.var as unknown as CustomerEnv['Variables']).session;
    const sessionOrders = getOrdersBySessionId(db, tenantId, session.id);
    return c.json({ data: sessionOrders });
  });

  // Place order — creates session if needed
  router.post('/orders', zValidator('json', placeOrderSchema), async (c) => {
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

        // Check last-order cutoff
        const lastOrderMinutes = typeof settings.lastOrderMinutesBefore === 'number' ? settings.lastOrderMinutesBefore : 0;
        if (lastOrderMinutes > 0 && todayHours) {
          const [closeH, closeM] = todayHours.close.split(':').map(Number);
          const totalMins = closeH * 60 + closeM - lastOrderMinutes;
          const cutoffH = Math.floor(Math.max(0, totalMins) / 60);
          const cutoffM = Math.max(0, totalMins) % 60;
          const cutoff = `${String(cutoffH).padStart(2, '0')}:${String(cutoffM).padStart(2, '0')}`;
          if (time >= cutoff) {
            return c.json({ error: `Last orders have been taken for today. Kitchen closes at ${cutoff}.` }, 400);
          }
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

    const result = await createOrder(db, tenantId, {
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

  // Customer updates notes on a specific order item
  router.patch(
    '/orders/:orderId/items/:itemId/notes',
    zValidator('json', updateItemNotesSchema),
    (c) => {
      const tenantId = c.var.tenantId;
      const orderId = c.req.param('orderId');
      const itemId = c.req.param('itemId');
      const { notes } = c.req.valid('json');
      const result = updateItemNotes(db, tenantId, orderId, itemId, notes);
      if ('error' in result) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.data });
    }
  );

  // --- Waiter Call (customer-facing, no auth) ---

  const callWaiterSchema = z.object({
    tableNumber: z.string().min(1, 'Table number is required'),
    callType: z.enum(WAITER_CALL_TYPES).optional().default('assistance'),
  });

  router.post('/call-waiter', zValidator('json', callWaiterSchema), (c) => {
    const tenantId = c.var.tenantId;
    const { tableNumber, callType } = c.req.valid('json');
    const call = createWaiterCall(db, tenantId, tableNumber, callType);
    return c.json({ data: call }, 201);
  });

  // --- Customer Feedback (no auth required) ---

  const submitFeedbackSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    tableNumber: z.string().min(1, 'Table number is required'),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
  });

  router.post('/feedback', zValidator('json', submitFeedbackSchema), (c) => {
    const tenantId = c.var.tenantId;
    const { orderId, tableNumber, rating, comment } = c.req.valid('json');
    const result = submitFeedback(db, tenantId, orderId, tableNumber, rating, comment);
    if ('error' in result) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ data: result.data }, 201);
  });

  return router;
}
