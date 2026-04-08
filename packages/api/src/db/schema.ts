import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

// --- Status Enums ---

export const STAFF_ROLES = ['owner', 'manager', 'staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

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
});

// --- Ordering Module Tables ---

export const menuCategories = sqliteTable('menu_categories', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
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
  isAvailable: integer('is_available').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

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
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  sessionId: text('session_id').references(() => customerSessions.id),
  tableNumber: text('table_number').notNull(),
  status: text('status').notNull().$type<OrderStatus>().default('pending'),
  notes: text('notes'),
  total: real('total').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orderId: text('order_id').notNull().references(() => orders.id),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  name: text('name').notNull(),
  price: real('price').notNull(),
  quantity: integer('quantity').notNull(),
  notes: text('notes'),
  modifiersJson: text('modifiers_json'),  // JSON snapshot: [{"name":"Large","price":2.50}]
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

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
