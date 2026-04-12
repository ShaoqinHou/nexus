import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';
import { ORDER_STATUSES, STAFF_ROLES, PROMOTION_TYPES, ORDER_ITEM_STATUSES, PAYMENT_STATUSES } from '@nexus/shared';
import type { OrderStatus, StaffRole, PromotionType, OrderItemStatus, PaymentStatus } from '@nexus/shared';

// Re-export shared constants for backward compatibility
export { ORDER_STATUSES, STAFF_ROLES, PROMOTION_TYPES, ORDER_ITEM_STATUSES, PAYMENT_STATUSES };
export type { OrderStatus, StaffRole, PromotionType, OrderItemStatus, PaymentStatus };

// --- Platform Tables ---

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  settings: text('settings').default('{}'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().$type<StaffRole>(),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('staff_tenant_email_idx').on(table.tenantId, table.email),
]);

export const customerSessions = sqliteTable('customer_sessions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  tableNumber: text('table_number').notNull(),
  sessionToken: text('session_token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_sessions_tenant_expires').on(table.tenantId, table.expiresAt),
]);

// --- Ordering Module Tables ---

export const CATEGORY_STATIONS = ['all', 'kitchen', 'bar'] as const;
export type CategoryStation = typeof CATEGORY_STATIONS[number];

export const menuCategories = sqliteTable('menu_categories', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  station: text('station').$type<CategoryStation>().notNull().default('all'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  categoryId: text('category_id').notNull().references(() => menuCategories.id),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  imageUrl: text('image_url'),
  tags: text('tags'), // comma-separated: "vegetarian,gluten-free,spicy"
  allergens: text('allergens'), // comma-separated: "gluten,dairy,nuts"
  isAvailable: integer('is_available').notNull().default(1),
  isFeatured: integer('is_featured').notNull().default(0),
  isSoldOut: integer('is_sold_out').default(0), // temporary sold-out (≠ inactive)
  soldOutUntil: text('sold_out_until'), // ISO datetime — auto-clears after this time
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_menu_items_tenant_active').on(table.tenantId, table.isActive),
  index('idx_menu_items_category').on(table.tenantId, table.categoryId),
]);

// --- Modifier Groups & Options ---

export const modifierGroups = sqliteTable('modifier_groups', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  minSelections: integer('min_selections').notNull().default(0),  // 0 = optional
  maxSelections: integer('max_selections').notNull().default(1),  // 1 = radio, >1 = checkbox
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const modifierOptions = sqliteTable('modifier_options', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  groupId: text('group_id').notNull().references(() => modifierGroups.id),
  name: text('name').notNull(),
  priceDelta: real('price_delta').notNull().default(0),  // +$2.50 for upgrade
  isDefault: integer('is_default').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Join table: which modifier groups apply to which menu items
export const menuItemModifierGroups = sqliteTable('menu_item_modifier_groups', {
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  modifierGroupId: text('modifier_group_id').notNull().references(() => modifierGroups.id),
  sortOrder: integer('sort_order').notNull().default(0),
  priceOverrides: text('price_overrides'), // nullable JSON: { "optionId": { "priceDelta": 4.00 } }
});

// --- Promotions ---

export const promotions = sqliteTable('promotions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<PromotionType>(),
  discountValue: real('discount_value').notNull(), // 20 = 20% or $20
  minOrderAmount: real('min_order_amount'),
  applicableCategories: text('applicable_categories'), // JSON array of category IDs, null = all
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at'),
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const promoCodes = sqliteTable('promo_codes', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  promotionId: text('promotion_id').notNull().references(() => promotions.id),
  code: text('code').notNull(),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// --- Combo Deals / Meal Bundles ---

export const comboDeals = sqliteTable('combo_deals', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  basePrice: real('base_price').notNull(),
  categoryId: text('category_id').references(() => menuCategories.id), // display in this category
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const comboSlots = sqliteTable('combo_slots', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  comboDealId: text('combo_deal_id').notNull().references(() => comboDeals.id),
  name: text('name').notNull(), // "Choose your Main"
  sortOrder: integer('sort_order').notNull().default(0),
  minSelections: integer('min_selections').notNull().default(1),
  maxSelections: integer('max_selections').notNull().default(1),
});

export const comboSlotOptions = sqliteTable('combo_slot_options', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  comboSlotId: text('combo_slot_id').notNull().references(() => comboSlots.id),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  priceModifier: real('price_modifier').notNull().default(0), // +$2 upgrade
  isDefault: integer('is_default').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const PAYMENT_METHODS = ['cash', 'card', 'qr_pay', 'voucher', 'complimentary'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  sessionId: text('session_id').references(() => customerSessions.id),
  tableNumber: text('table_number').notNull(),
  status: text('status').notNull().$type<OrderStatus>().default('pending'),
  paymentStatus: text('payment_status').notNull().$type<PaymentStatus>().default('unpaid'),
  paymentMethod: text('payment_method').$type<PaymentMethod>(), // recorded when marked paid
  notes: text('notes'),                // customer notes
  staffNotes: text('staff_notes'),     // staff-added notes (internal)
  total: real('total').notNull(),
  discountAmount: real('discount_amount').default(0),
  taxAmount: real('tax_amount').default(0),
  discountOverride: real('discount_override'), // manager-applied ad-hoc discount
  overrideReason: text('override_reason'),
  overrideBy: text('override_by'),     // staff ID who applied override
  promoCodeId: text('promo_code_id').references(() => promoCodes.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_orders_tenant_status').on(table.tenantId, table.status),
  index('idx_orders_tenant_created').on(table.tenantId, table.createdAt),
  index('idx_orders_table').on(table.tenantId, table.tableNumber),
]);

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orderId: text('order_id').notNull().references(() => orders.id),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  name: text('name').notNull(),
  price: real('price').notNull(),
  quantity: integer('quantity').notNull(),
  notes: text('notes'),
  allergens: text('allergens'), // snapshot from menu item at order time (comma-separated)
  modifiersJson: text('modifiers_json'),
  comboDealId: text('combo_deal_id').references(() => comboDeals.id),
  comboGroupId: text('combo_group_id'),
  status: text('status').notNull().$type<OrderItemStatus>().default('active'),
  completedAt: text('completed_at'), // ISO datetime — set by kitchen when item is done
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_order_items_order').on(table.orderId),
]);

// --- Table Status ---

export const TABLE_STATUSES = ['free', 'occupied', 'needs_cleaning'] as const;
export type TableStatus = typeof TABLE_STATUSES[number];

export const tableStatuses = sqliteTable('table_statuses', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  tableNumber: text('table_number').notNull(),
  status: text('status').notNull().$type<TableStatus>().default('free'),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('table_statuses_tenant_table_idx').on(table.tenantId, table.tableNumber),
]);

// --- Waiter Calls ---

export const WAITER_CALL_TYPES = ['assistance', 'bill'] as const;
export type WaiterCallType = typeof WAITER_CALL_TYPES[number];

export const waiterCalls = sqliteTable('waiter_calls', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  tableNumber: text('table_number').notNull(),
  callType: text('call_type').$type<WaiterCallType>().notNull().default('assistance'),
  acknowledged: integer('acknowledged', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_waiter_calls_tenant_ack').on(table.tenantId, table.acknowledged),
]);

// --- Customer Feedback ---

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  orderId: text('order_id').notNull().references(() => orders.id),
  tableNumber: text('table_number').notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_feedback_tenant').on(table.tenantId, table.createdAt),
]);

// --- Inferred Types ---

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type CustomerSession = typeof customerSessions.$inferSelect;
export type NewCustomerSession = typeof customerSessions.$inferInsert;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type ModifierGroup = typeof modifierGroups.$inferSelect;
export type ModifierOption = typeof modifierOptions.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;
export type ComboDeal = typeof comboDeals.$inferSelect;
export type NewComboDeal = typeof comboDeals.$inferInsert;
export type ComboSlot = typeof comboSlots.$inferSelect;
export type NewComboSlot = typeof comboSlots.$inferInsert;
export type ComboSlotOption = typeof comboSlotOptions.$inferSelect;
export type NewComboSlotOption = typeof comboSlotOptions.$inferInsert;
export type TableStatusRow = typeof tableStatuses.$inferSelect;
export type NewTableStatus = typeof tableStatuses.$inferInsert;
export type WaiterCall = typeof waiterCalls.$inferSelect;
export type NewWaiterCall = typeof waiterCalls.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
