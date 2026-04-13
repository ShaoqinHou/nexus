import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getPublicMenu,
  createOrder,
  getOrder,
  getOrders,
  updateOrderStatus,
  addItemsToOrder,
  requestItemCancellation,
  handleCancellationRequest,
  getModifierGroups,
  createModifierGroup,
  deleteModifierGroup,
  getModifierOptions,
  createModifierOption,
  getItemModifierGroups,
  setItemModifierGroups,
  getPromotions,
  createPromotion,
  deletePromotion,
  getPromoCodes,
  createPromoCode,
  validatePromoCode,
  applyPromotion,
  getComboDeals,
  createComboDeal,
  deleteComboDeal,
  getPublicCombos,
  getDailyRevenue,
  getTopItems,
  getOrderStats,
  getStatusBreakdown,
} from '../service';

type TestDB = ReturnType<typeof createTestDb>;

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      settings TEXT DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE staff (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE customer_sessions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      table_number TEXT NOT NULL,
      session_token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE menu_categories (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      station TEXT NOT NULL DEFAULT 'all',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE menu_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      category_id TEXT NOT NULL REFERENCES menu_categories(id),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      tags TEXT,
      allergens TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1,
      is_sold_out INTEGER DEFAULT 0,
      sold_out_until TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE promotions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      min_order_amount REAL,
      applicable_categories TEXT,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      max_uses INTEGER,
      current_uses INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE promo_codes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      promotion_id TEXT NOT NULL REFERENCES promotions(id),
      code TEXT NOT NULL,
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE combo_deals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      base_price REAL NOT NULL,
      category_id TEXT REFERENCES menu_categories(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE combo_slots (
      id TEXT PRIMARY KEY,
      combo_deal_id TEXT NOT NULL REFERENCES combo_deals(id),
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      min_selections INTEGER NOT NULL DEFAULT 1,
      max_selections INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE combo_slot_options (
      id TEXT PRIMARY KEY,
      combo_slot_id TEXT NOT NULL REFERENCES combo_slots(id),
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
      price_modifier REAL NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      session_id TEXT REFERENCES customer_sessions(id),
      table_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_method TEXT,
      notes TEXT,
      staff_notes TEXT,
      total REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      discount_override REAL,
      override_reason TEXT,
      override_by TEXT,
      promo_code_id TEXT REFERENCES promo_codes(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      modifiers_json TEXT,
      allergens TEXT,
      combo_deal_id TEXT REFERENCES combo_deals(id),
      combo_group_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE modifier_groups (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      min_selections INTEGER NOT NULL DEFAULT 0,
      max_selections INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE modifier_options (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES modifier_groups(id),
      name TEXT NOT NULL,
      price_delta REAL NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE menu_item_modifier_groups (
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
      modifier_group_id TEXT NOT NULL REFERENCES modifier_groups(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      price_overrides TEXT
    );

    CREATE TABLE table_statuses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      table_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'free',
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX table_statuses_tenant_table_idx ON table_statuses(tenant_id, table_number);

    CREATE TABLE order_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      paid_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE content_translations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      locale TEXT NOT NULL,
      field TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX idx_ct_lookup ON content_translations(tenant_id, entity_type, entity_id, locale, field);
  `);

  return drizzle(sqlite, { schema });
}

function createTestTenant(db: TestDB, slug: string) {
  return db
    .insert(schema.tenants)
    .values({
      name: `Tenant ${slug}`,
      slug,
    })
    .returning()
    .get();
}

// ---------------------------------------------------------------------------
// Menu Categories
// ---------------------------------------------------------------------------

describe('Menu Categories', () => {
  let db: TestDB;
  let tenantId: string;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
  });

  it('creates a category and returns it with all fields', async () => {
    const category = createCategory(db, tenantId, {
      name: 'Mains',
      description: 'Main courses',
    });

    expect(category).toBeDefined();
    expect(category.id).toEqual(expect.any(String));
    expect(category.name).toBe('Mains');
    expect(category.description).toBe('Main courses');
    expect(category.tenantId).toBe(tenantId);
    expect(category.sortOrder).toBe(0);
    expect(category.isActive).toBe(1);
    expect(category.createdAt).toEqual(expect.any(String));
    expect(category.updatedAt).toEqual(expect.any(String));
  });

  it('lists only active categories for the given tenant', async () => {
    createCategory(db, tenantId, { name: 'Mains' });
    createCategory(db, tenantId, { name: 'Drinks' });
    const toDelete = createCategory(db, tenantId, { name: 'Old' });
    deleteCategory(db, tenantId, toDelete.id);

    const categories = getCategories(db, tenantId);
    expect(categories).toHaveLength(2);
    expect(categories.map((c) => c.name)).toEqual(
      expect.arrayContaining(['Mains', 'Drinks'])
    );
  });

  it('updates a category name and description', async () => {
    const original = createCategory(db, tenantId, {
      name: 'Mains',
      description: 'Old desc',
    });

    const updated = updateCategory(db, tenantId, original.id, {
      name: 'Entrees',
      description: 'New desc',
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe('Entrees');
    expect(updated!.description).toBe('New desc');
    // updatedAt is refreshed by the service (may match if same ms, so just verify it's set)
    expect(updated!.updatedAt).toEqual(expect.any(String));
  });

  it('soft deletes a category (sets isActive=0)', async () => {
    const category = createCategory(db, tenantId, { name: 'ToDelete' });
    const deleted = deleteCategory(db, tenantId, category.id);

    expect(deleted).toBeDefined();
    expect(deleted!.isActive).toBe(0);

    // Should no longer appear in active list
    const categories = getCategories(db, tenantId);
    expect(categories.find((c) => c.id === category.id)).toBeUndefined();
  });

  it('returns categories sorted by sortOrder', async () => {
    const c1 = createCategory(db, tenantId, { name: 'Desserts' });
    const c2 = createCategory(db, tenantId, { name: 'Starters' });
    const c3 = createCategory(db, tenantId, { name: 'Mains' });

    updateCategory(db, tenantId, c1.id, { sortOrder: 3 });
    updateCategory(db, tenantId, c2.id, { sortOrder: 1 });
    updateCategory(db, tenantId, c3.id, { sortOrder: 2 });

    const categories = getCategories(db, tenantId);
    expect(categories.map((c) => c.name)).toEqual([
      'Starters',
      'Mains',
      'Desserts',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Menu Items
// ---------------------------------------------------------------------------

describe('Menu Items', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
    const category = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = category.id;
  });

  it('creates an item with valid category', async () => {
    const result = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      description: 'Beef burger',
      price: 15.5,
    });

    expect(result).not.toHaveProperty('error');
    expect(result).toHaveProperty('data');
    const item = (result as { data: schema.MenuItem }).data;
    expect(item.name).toBe('Burger');
    expect(item.price).toBe(15.5);
    expect(item.tenantId).toBe(tenantId);
    expect(item.categoryId).toBe(categoryId);
    expect(item.isAvailable).toBe(1);
    expect(item.isActive).toBe(1);
  });

  it('returns error when creating item with invalid categoryId', async () => {
    const result = createMenuItem(db, tenantId, {
      categoryId: 'nonexistent-id',
      name: 'Burger',
      price: 15.5,
    });

    expect(result).toHaveProperty('error', 'Category not found');
  });

  it('returns error when creating item with other tenant category', async () => {
    const otherTenant = createTestTenant(db, 'other-tenant');
    const otherCategory = createCategory(db, otherTenant.id, {
      name: 'Other Mains',
    });

    const result = createMenuItem(db, tenantId, {
      categoryId: otherCategory.id,
      name: 'Burger',
      price: 15.5,
    });

    expect(result).toHaveProperty('error', 'Category not found');
  });

  it('lists items filtered by categoryId', async () => {
    const drinks = createCategory(db, tenantId, { name: 'Drinks' });
    createMenuItem(db, tenantId, { categoryId, name: 'Burger', price: 15 });
    createMenuItem(db, tenantId, { categoryId, name: 'Steak', price: 30 });
    createMenuItem(db, tenantId, {
      categoryId: drinks.id,
      name: 'Cola',
      price: 4,
    });

    const mainsItems = getMenuItems(db, tenantId, categoryId);
    expect(mainsItems).toHaveLength(2);
    expect(mainsItems.map((i) => i.name)).toEqual(
      expect.arrayContaining(['Burger', 'Steak'])
    );

    const drinkItems = getMenuItems(db, tenantId, drinks.id);
    expect(drinkItems).toHaveLength(1);
    expect(drinkItems[0].name).toBe('Cola');
  });

  it('soft deletes an item', async () => {
    const result = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      price: 15,
    });
    const item = (result as { data: schema.MenuItem }).data;

    const deleted = deleteMenuItem(db, tenantId, item.id);
    expect(deleted).toBeDefined();
    expect(deleted!.isActive).toBe(0);

    const items = getMenuItems(db, tenantId, categoryId);
    expect(items.find((i) => i.id === item.id)).toBeUndefined();
  });

  it('updates item fields including price', async () => {
    const result = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      price: 15,
    });
    const item = (result as { data: schema.MenuItem }).data;

    const updateResult = updateMenuItem(db, tenantId, item.id, {
      name: 'Deluxe Burger',
      price: 20.99,
      description: 'Premium beef',
    });

    expect(updateResult).toHaveProperty('data');
    const updated = (updateResult as { data: schema.MenuItem }).data;
    expect(updated.name).toBe('Deluxe Burger');
    expect(updated.price).toBe(20.99);
    expect(updated.description).toBe('Premium beef');
  });
});

// ---------------------------------------------------------------------------
// Public Menu
// ---------------------------------------------------------------------------

describe('Public Menu', () => {
  let db: TestDB;
  let tenantId: string;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
  });

  it('returns only active categories with available items', async () => {
    const cat = createCategory(db, tenantId, { name: 'Mains' });
    createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Burger',
      price: 15,
    });
    createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Steak',
      price: 30,
    });

    const { categories: menu } = getPublicMenu(db, tenantId);
    expect(menu).toHaveLength(1);
    expect(menu[0].category.name).toBe('Mains');
    expect(menu[0].items).toHaveLength(2);
  });

  it('excludes inactive categories', async () => {
    const active = createCategory(db, tenantId, { name: 'Active' });
    const inactive = createCategory(db, tenantId, { name: 'Inactive' });
    createMenuItem(db, tenantId, {
      categoryId: active.id,
      name: 'Item A',
      price: 10,
    });
    createMenuItem(db, tenantId, {
      categoryId: inactive.id,
      name: 'Item B',
      price: 10,
    });
    deleteCategory(db, tenantId, inactive.id);

    const { categories: menu2 } = getPublicMenu(db, tenantId);
    expect(menu2).toHaveLength(1);
    expect(menu2[0].category.name).toBe('Active');
  });

  it('excludes unavailable items (isAvailable=0)', async () => {
    const cat = createCategory(db, tenantId, { name: 'Mains' });
    const burgerResult = createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Burger',
      price: 15,
    });
    createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Steak',
      price: 30,
    });
    const burger = (burgerResult as { data: schema.MenuItem }).data;

    updateMenuItem(db, tenantId, burger.id, { isAvailable: 0 });

    const { categories: menu3 } = getPublicMenu(db, tenantId);
    expect(menu3).toHaveLength(1);
    expect(menu3[0].items).toHaveLength(1);
    expect(menu3[0].items[0].name).toBe('Steak');
  });

  it('returns empty for tenant with no menu', async () => {
    const { categories: menu4 } = getPublicMenu(db, tenantId);
    expect(menu4).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

describe('Orders', () => {
  let db: TestDB;
  let tenantId: string;
  let itemA: schema.MenuItem;
  let itemB: schema.MenuItem;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;

    const cat = createCategory(db, tenantId, { name: 'Mains' });
    const resultA = createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Burger',
      price: 12.5,
    });
    const resultB = createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Fries',
      price: 8.0,
    });
    itemA = (resultA as { data: schema.MenuItem }).data;
    itemB = (resultB as { data: schema.MenuItem }).data;
  });

  it('creates order with valid items, snapshots name+price, calculates total', async () => {
    const result = await createOrder(db,tenantId, {
      tableNumber: '5',
      items: [
        { menuItemId: itemA.id, quantity: 2 },
        { menuItemId: itemB.id, quantity: 1 },
      ],
    });

    expect(result).toHaveProperty('data');
    const order = (result as { data: { total: number; items: schema.OrderItem[]; tableNumber: string } }).data;
    expect(order.tableNumber).toBe('5');
    expect(order.total).toBe(33.0);
    expect(order.items).toHaveLength(2);

    const burgerItem = order.items.find((i) => i.menuItemId === itemA.id)!;
    expect(burgerItem.name).toBe('Burger');
    expect(burgerItem.price).toBe(12.5);
    expect(burgerItem.quantity).toBe(2);

    const friesItem = order.items.find((i) => i.menuItemId === itemB.id)!;
    expect(friesItem.name).toBe('Fries');
    expect(friesItem.price).toBe(8.0);
    expect(friesItem.quantity).toBe(1);
  });

  it('returns error for empty items array', async () => {
    const result = await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [],
    });

    expect(result).toHaveProperty(
      'error',
      'Order must contain at least one item'
    );
  });

  it('returns error for invalid menu item ID', async () => {
    const result = await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: 'nonexistent', quantity: 1 }],
    });

    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('nonexistent');
  });

  it('returns error for unavailable menu item', async () => {
    updateMenuItem(db, tenantId, itemA.id, { isAvailable: 0 });

    const result = await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });

    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain(itemA.id);
  });

  it('calculates total correctly with multiple items and quantities', async () => {
    const result = await createOrder(db,tenantId, {
      tableNumber: '3',
      items: [
        { menuItemId: itemA.id, quantity: 3 }, // 12.50 * 3 = 37.50
        { menuItemId: itemB.id, quantity: 2 }, //  8.00 * 2 = 16.00
      ],
    });

    const order = (result as { data: { total: number } }).data;
    expect(order.total).toBe(53.5);
  });

  it('rounds total to 2 decimal places', async () => {
    // Create an item with a price that causes floating point issues
    const cat = createCategory(db, tenantId, { name: 'Special' });
    const result = createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Tricky',
      price: 0.1,
    });
    const trickyItem = (result as { data: schema.MenuItem }).data;

    const orderResult = await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [
        { menuItemId: trickyItem.id, quantity: 3 }, // 0.1 * 3 = 0.30 (not 0.30000000000000004)
      ],
    });

    const order = (orderResult as { data: { total: number } }).data;
    expect(order.total).toBe(0.3);
  });

  it('updates order status and returns order with items', async () => {
    const createResult = await createOrder(db,tenantId, {
      tableNumber: '5',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    const orderId = (createResult as { data: { id: string } }).data.id;

    const updated = updateOrderStatus(db, tenantId, orderId, 'confirmed');
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('confirmed');
    expect(updated!.items).toHaveLength(1);
  });

  it('returns undefined for non-existent order', async () => {
    const result = getOrder(db, tenantId, 'nonexistent-order-id');
    expect(result).toBeUndefined();
  });

  it('lists orders sorted by createdAt desc', async () => {
    // Create orders with small time gaps to ensure ordering
    await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '2',
      items: [{ menuItemId: itemB.id, quantity: 1 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '3',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });

    const result = getOrders(db, tenantId);
    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);

    // Verify desc ordering: each createdAt should be >= the next
    for (let i = 0; i < result.data.length - 1; i++) {
      expect(result.data[i].createdAt >= result.data[i + 1].createdAt).toBe(
        true
      );
    }
  });

  it('filters orders by status', async () => {
    const r1 = await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '2',
      items: [{ menuItemId: itemB.id, quantity: 1 }],
    });

    const orderId1 = (r1 as { data: { id: string } }).data.id;
    updateOrderStatus(db, tenantId, orderId1, 'confirmed');

    const confirmedResult = getOrders(db, tenantId, { status: 'confirmed' });
    expect(confirmedResult.data).toHaveLength(1);
    expect(confirmedResult.data[0].status).toBe('confirmed');

    const pendingResult = getOrders(db, tenantId, { status: 'pending' });
    expect(pendingResult.data).toHaveLength(1);
    expect(pendingResult.data[0].status).toBe('pending');
  });

  it('filters orders by tableNumber', async () => {
    await createOrder(db,tenantId, {
      tableNumber: '5',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '5',
      items: [{ menuItemId: itemB.id, quantity: 1 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '10',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });

    const table5 = getOrders(db, tenantId, { tableNumber: '5' });
    expect(table5.data).toHaveLength(2);
    expect(table5.total).toBe(2);

    const table10 = getOrders(db, tenantId, { tableNumber: '10' });
    expect(table10.data).toHaveLength(1);
    expect(table10.total).toBe(1);
  });

  it('paginates orders — page 2 returns different results than page 1', async () => {
    // Create 4 orders
    for (let i = 1; i <= 4; i++) {
      await createOrder(db,tenantId, {
        tableNumber: String(i),
        items: [{ menuItemId: itemA.id, quantity: 1 }],
      });
    }

    const page1 = getOrders(db, tenantId, { limit: 2, page: 1 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(4);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(2);

    const page2 = getOrders(db, tenantId, { limit: 2, page: 2 });
    expect(page2.data).toHaveLength(2);
    expect(page2.total).toBe(4);
    expect(page2.page).toBe(2);

    // Pages should have different order IDs (no overlap)
    const page1Ids = new Set(page1.data.map((o) => o.id));
    for (const order of page2.data) {
      expect(page1Ids.has(order.id)).toBe(false);
    }
  });

  it('paginates orders — beyond last page returns empty data', async () => {
    await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });

    const page99 = getOrders(db, tenantId, { limit: 10, page: 99 });
    expect(page99.data).toHaveLength(0);
    expect(page99.total).toBe(1); // total still reflects real count
    expect(page99.page).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Tenant Isolation — CRITICAL
// ---------------------------------------------------------------------------

describe('Tenant Isolation', () => {
  let db: TestDB;
  let tenantAId: string;
  let tenantBId: string;

  beforeEach(() => {
    db = createTestDb();
    const tenantA = createTestTenant(db, 'tenant-a');
    const tenantB = createTestTenant(db, 'tenant-b');
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;
  });

  it('getCategories for tenant A does not return tenant B categories', async () => {
    createCategory(db, tenantAId, { name: 'A Mains' });
    createCategory(db, tenantBId, { name: 'B Mains' });

    const aCats = getCategories(db, tenantAId);
    expect(aCats).toHaveLength(1);
    expect(aCats[0].name).toBe('A Mains');

    const bCats = getCategories(db, tenantBId);
    expect(bCats).toHaveLength(1);
    expect(bCats[0].name).toBe('B Mains');
  });

  it('getMenuItems for tenant A does not return tenant B items', async () => {
    const catA = createCategory(db, tenantAId, { name: 'A Mains' });
    const catB = createCategory(db, tenantBId, { name: 'B Mains' });
    createMenuItem(db, tenantAId, {
      categoryId: catA.id,
      name: 'A Burger',
      price: 10,
    });
    createMenuItem(db, tenantBId, {
      categoryId: catB.id,
      name: 'B Burger',
      price: 12,
    });

    const aItems = getMenuItems(db, tenantAId);
    expect(aItems).toHaveLength(1);
    expect(aItems[0].name).toBe('A Burger');

    const bItems = getMenuItems(db, tenantBId);
    expect(bItems).toHaveLength(1);
    expect(bItems[0].name).toBe('B Burger');
  });

  it('getOrders for tenant A does not return tenant B orders', async () => {
    const catA = createCategory(db, tenantAId, { name: 'A Mains' });
    const catB = createCategory(db, tenantBId, { name: 'B Mains' });
    const itemAResult = createMenuItem(db, tenantAId, {
      categoryId: catA.id,
      name: 'A Burger',
      price: 10,
    });
    const itemBResult = createMenuItem(db, tenantBId, {
      categoryId: catB.id,
      name: 'B Burger',
      price: 12,
    });
    const itemAData = (itemAResult as { data: schema.MenuItem }).data;
    const itemBData = (itemBResult as { data: schema.MenuItem }).data;

    await createOrder(db,tenantAId, {
      tableNumber: '1',
      items: [{ menuItemId: itemAData.id, quantity: 1 }],
    });
    await createOrder(db,tenantBId, {
      tableNumber: '2',
      items: [{ menuItemId: itemBData.id, quantity: 1 }],
    });

    const aOrders = getOrders(db, tenantAId);
    expect(aOrders.data).toHaveLength(1);
    expect(aOrders.data[0].tableNumber).toBe('1');

    const bOrders = getOrders(db, tenantBId);
    expect(bOrders.data).toHaveLength(1);
    expect(bOrders.data[0].tableNumber).toBe('2');
  });

  it('createMenuItem with tenant A ID and tenant B category returns error', async () => {
    const catB = createCategory(db, tenantBId, { name: 'B Mains' });

    const result = createMenuItem(db, tenantAId, {
      categoryId: catB.id,
      name: 'Cross-tenant item',
      price: 10,
    });

    expect(result).toHaveProperty('error', 'Category not found');
  });

  it('updateOrderStatus for tenant A cannot update tenant B order', async () => {
    const catB = createCategory(db, tenantBId, { name: 'B Mains' });
    const itemBResult = createMenuItem(db, tenantBId, {
      categoryId: catB.id,
      name: 'B Burger',
      price: 12,
    });
    const itemBData = (itemBResult as { data: schema.MenuItem }).data;

    const orderResult = await createOrder(db,tenantBId, {
      tableNumber: '1',
      items: [{ menuItemId: itemBData.id, quantity: 1 }],
    });
    const orderId = (orderResult as { data: { id: string } }).data.id;

    // Tenant A tries to update tenant B's order
    const result = updateOrderStatus(db, tenantAId, orderId, 'confirmed');
    expect(result).toBeUndefined();

    // Verify the order is still pending via tenant B
    const order = getOrder(db, tenantBId, orderId);
    expect(order).toBeDefined();
    expect(order!.status).toBe('pending');
  });

  it('getPublicMenu for tenant A does not include tenant B data', async () => {
    const catA = createCategory(db, tenantAId, { name: 'A Mains' });
    const catB = createCategory(db, tenantBId, { name: 'B Mains' });
    createMenuItem(db, tenantAId, {
      categoryId: catA.id,
      name: 'A Burger',
      price: 10,
    });
    createMenuItem(db, tenantBId, {
      categoryId: catB.id,
      name: 'B Burger',
      price: 12,
    });

    const { categories: menuA } = getPublicMenu(db, tenantAId);
    expect(menuA).toHaveLength(1);
    expect(menuA[0].category.name).toBe('A Mains');
    expect(menuA[0].items).toHaveLength(1);
    expect(menuA[0].items[0].name).toBe('A Burger');

    const { categories: menuB } = getPublicMenu(db, tenantBId);
    expect(menuB).toHaveLength(1);
    expect(menuB[0].category.name).toBe('B Mains');
    expect(menuB[0].items).toHaveLength(1);
    expect(menuB[0].items[0].name).toBe('B Burger');
  });

  it('modifier groups for tenant A not visible to tenant B', async () => {
    createModifierGroup(db, tenantAId, { name: 'A Sizes' });
    createModifierGroup(db, tenantBId, { name: 'B Sizes' });

    const aGroups = getModifierGroups(db, tenantAId);
    expect(aGroups).toHaveLength(1);
    expect(aGroups[0].name).toBe('A Sizes');

    const bGroups = getModifierGroups(db, tenantBId);
    expect(bGroups).toHaveLength(1);
    expect(bGroups[0].name).toBe('B Sizes');
  });

  it('promotions for tenant A not visible to tenant B', async () => {
    createPromotion(db, tenantAId, {
      name: 'A Promo',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
    });
    createPromotion(db, tenantBId, {
      name: 'B Promo',
      type: 'percentage',
      discountValue: 20,
      startsAt: '2020-01-01T00:00:00Z',
    });

    const aPromos = getPromotions(db, tenantAId);
    expect(aPromos).toHaveLength(1);
    expect(aPromos[0].name).toBe('A Promo');

    const bPromos = getPromotions(db, tenantBId);
    expect(bPromos).toHaveLength(1);
    expect(bPromos[0].name).toBe('B Promo');
  });

  it('combo deals for tenant A not visible to tenant B', async () => {
    const catA = createCategory(db, tenantAId, { name: 'A Mains' });
    const catB = createCategory(db, tenantBId, { name: 'B Mains' });
    const itemAResult = createMenuItem(db, tenantAId, {
      categoryId: catA.id,
      name: 'A Burger',
      price: 10,
    });
    const itemBResult = createMenuItem(db, tenantBId, {
      categoryId: catB.id,
      name: 'B Burger',
      price: 12,
    });
    const itemAData = (itemAResult as { data: schema.MenuItem }).data;
    const itemBData = (itemBResult as { data: schema.MenuItem }).data;

    createComboDeal(db, tenantAId, {
      name: 'A Combo',
      basePrice: 15,
      slots: [
        {
          name: 'Main',
          options: [{ menuItemId: itemAData.id }],
        },
      ],
    });
    createComboDeal(db, tenantBId, {
      name: 'B Combo',
      basePrice: 18,
      slots: [
        {
          name: 'Main',
          options: [{ menuItemId: itemBData.id }],
        },
      ],
    });

    const aCombos = getComboDeals(db, tenantAId);
    expect(aCombos).toHaveLength(1);
    expect(aCombos[0].name).toBe('A Combo');

    const bCombos = getComboDeals(db, tenantBId);
    expect(bCombos).toHaveLength(1);
    expect(bCombos[0].name).toBe('B Combo');
  });
});

// ---------------------------------------------------------------------------
// Modifier Groups
// ---------------------------------------------------------------------------

describe('Modifier Groups', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
    const category = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = category.id;
  });

  it('creates a modifier group and returns it', async () => {
    const group = createModifierGroup(db, tenantId, {
      name: 'Size',
      minSelections: 1,
      maxSelections: 1,
    });

    expect(group).toBeDefined();
    expect(group.id).toEqual(expect.any(String));
    expect(group.name).toBe('Size');
    expect(group.tenantId).toBe(tenantId);
    expect(group.minSelections).toBe(1);
    expect(group.maxSelections).toBe(1);
    expect(group.isActive).toBe(1);
    expect(group.createdAt).toEqual(expect.any(String));
  });

  it('lists only active groups for the tenant', async () => {
    createModifierGroup(db, tenantId, { name: 'Size' });
    createModifierGroup(db, tenantId, { name: 'Extras' });
    const toDelete = createModifierGroup(db, tenantId, { name: 'Old' });
    deleteModifierGroup(db, tenantId, toDelete.id);

    const groups = getModifierGroups(db, tenantId);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.name)).toEqual(
      expect.arrayContaining(['Size', 'Extras'])
    );
  });

  it('creates modifier options with price deltas', async () => {
    const group = createModifierGroup(db, tenantId, { name: 'Size' });

    const smallResult = createModifierOption(db, tenantId, {
      groupId: group.id,
      name: 'Small',
      priceDelta: 0,
    });
    const largeResult = createModifierOption(db, tenantId, {
      groupId: group.id,
      name: 'Large',
      priceDelta: 2.5,
    });

    expect(smallResult).toHaveProperty('data');
    expect(largeResult).toHaveProperty('data');

    const small = (smallResult as { data: schema.ModifierOption }).data;
    const large = (largeResult as { data: schema.ModifierOption }).data;

    expect(small.name).toBe('Small');
    expect(small.priceDelta).toBe(0);
    expect(large.name).toBe('Large');
    expect(large.priceDelta).toBe(2.5);

    const options = getModifierOptions(db, tenantId, group.id);
    expect(options).toHaveLength(2);
  });

  it('soft deletes a modifier group', async () => {
    const group = createModifierGroup(db, tenantId, { name: 'ToDelete' });
    const deleted = deleteModifierGroup(db, tenantId, group.id);

    expect(deleted).toBeDefined();
    expect(deleted!.isActive).toBe(0);

    const groups = getModifierGroups(db, tenantId);
    expect(groups.find((g) => g.id === group.id)).toBeUndefined();
  });

  it('links modifier groups to menu items via setItemModifierGroups', async () => {
    const itemResult = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      price: 15,
    });
    const item = (itemResult as { data: schema.MenuItem }).data;

    const sizeGroup = createModifierGroup(db, tenantId, { name: 'Size' });
    const extrasGroup = createModifierGroup(db, tenantId, { name: 'Extras' });

    const result = setItemModifierGroups(db, tenantId, item.id, [
      sizeGroup.id,
      extrasGroup.id,
    ]);

    expect(result).toHaveProperty('data');
    const linked = (result as { data: unknown[] }).data;
    expect(linked).toHaveLength(2);
  });

  it('getItemModifierGroups returns correct groups for an item', async () => {
    const itemResult = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      price: 15,
    });
    const item = (itemResult as { data: schema.MenuItem }).data;

    const sizeGroup = createModifierGroup(db, tenantId, { name: 'Size' });
    createModifierOption(db, tenantId, {
      groupId: sizeGroup.id,
      name: 'Small',
      priceDelta: 0,
    });
    createModifierOption(db, tenantId, {
      groupId: sizeGroup.id,
      name: 'Large',
      priceDelta: 3,
    });

    setItemModifierGroups(db, tenantId, item.id, [sizeGroup.id]);

    const groups = getItemModifierGroups(db, tenantId, item.id);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Size');
    expect(groups[0].options).toHaveLength(2);
    expect(groups[0].options.map((o) => o.name)).toEqual(
      expect.arrayContaining(['Small', 'Large'])
    );
  });

  it('getPublicMenu includes modifier groups on items', async () => {
    const itemResult = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      price: 15,
    });
    const item = (itemResult as { data: schema.MenuItem }).data;

    const sizeGroup = createModifierGroup(db, tenantId, { name: 'Size' });
    createModifierOption(db, tenantId, {
      groupId: sizeGroup.id,
      name: 'Regular',
      priceDelta: 0,
    });
    createModifierOption(db, tenantId, {
      groupId: sizeGroup.id,
      name: 'Large',
      priceDelta: 2,
    });
    setItemModifierGroups(db, tenantId, item.id, [sizeGroup.id]);

    const { categories: menu } = getPublicMenu(db, tenantId);
    expect(menu).toHaveLength(1);
    expect(menu[0].items).toHaveLength(1);

    const publicItem = menu[0].items[0];
    expect(publicItem.modifierGroups).toHaveLength(1);
    expect(publicItem.modifierGroups[0].name).toBe('Size');
    expect(publicItem.modifierGroups[0].options).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

describe('Promotions', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;
  let itemA: schema.MenuItem;
  let itemB: schema.MenuItem;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
    const cat = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = cat.id;
    const resultA = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      price: 12.5,
    });
    const resultB = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Fries',
      price: 8.0,
    });
    itemA = (resultA as { data: schema.MenuItem }).data;
    itemB = (resultB as { data: schema.MenuItem }).data;
  });

  it('creates a promotion (percentage type)', async () => {
    const promo = createPromotion(db, tenantId, {
      name: '20% Off',
      type: 'percentage',
      discountValue: 20,
      startsAt: '2020-01-01T00:00:00Z',
    });

    expect(promo).toBeDefined();
    expect(promo.id).toEqual(expect.any(String));
    expect(promo.name).toBe('20% Off');
    expect(promo.type).toBe('percentage');
    expect(promo.discountValue).toBe(20);
    expect(promo.tenantId).toBe(tenantId);
    expect(promo.isActive).toBe(1);
    expect(promo.currentUses).toBe(0);
  });

  it('creates a promotion (fixed_amount type)', async () => {
    const promo = createPromotion(db, tenantId, {
      name: '$5 Off',
      type: 'fixed_amount',
      discountValue: 5,
      startsAt: '2020-01-01T00:00:00Z',
    });

    expect(promo.type).toBe('fixed_amount');
    expect(promo.discountValue).toBe(5);
  });

  it('lists active promotions for a tenant', async () => {
    createPromotion(db, tenantId, {
      name: 'Promo A',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
    });
    createPromotion(db, tenantId, {
      name: 'Promo B',
      type: 'fixed_amount',
      discountValue: 5,
      startsAt: '2020-01-01T00:00:00Z',
    });

    const promos = getPromotions(db, tenantId);
    expect(promos).toHaveLength(2);
    expect(promos.map((p) => p.name)).toEqual(
      expect.arrayContaining(['Promo A', 'Promo B'])
    );
  });

  it('soft deletes a promotion', async () => {
    const promo = createPromotion(db, tenantId, {
      name: 'ToDelete',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
    });
    const deleted = deletePromotion(db, tenantId, promo.id);

    expect(deleted).toBeDefined();
    expect(deleted!.isActive).toBe(0);

    const promos = getPromotions(db, tenantId);
    expect(promos.find((p) => p.id === promo.id)).toBeUndefined();
  });

  it('creates a promo code for a promotion', async () => {
    const promo = createPromotion(db, tenantId, {
      name: 'Summer Sale',
      type: 'percentage',
      discountValue: 15,
      startsAt: '2020-01-01T00:00:00Z',
    });

    const result = createPromoCode(db, tenantId, {
      promotionId: promo.id,
      code: 'SUMMER15',
      usageLimit: 100,
    });

    expect(result).toHaveProperty('data');
    const code = (result as { data: schema.PromoCode }).data;
    expect(code.code).toBe('SUMMER15');
    expect(code.promotionId).toBe(promo.id);
    expect(code.usageLimit).toBe(100);
    expect(code.usageCount).toBe(0);
    expect(code.tenantId).toBe(tenantId);

    const codes = getPromoCodes(db, tenantId, promo.id);
    expect(codes).toHaveLength(1);
  });

  it('validates a valid promo code', async () => {
    const promo = createPromotion(db, tenantId, {
      name: 'Active Promo',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
      endsAt: '2099-12-31T23:59:59Z',
    });
    createPromoCode(db, tenantId, {
      promotionId: promo.id,
      code: 'VALID10',
    });

    const result = validatePromoCode(db, tenantId, 'valid10'); // case insensitive
    expect(result).toHaveProperty('data');
    const data = (result as { data: { promotion: schema.Promotion; promoCode: { id: string; code: string } } }).data;
    expect(data.promotion.id).toBe(promo.id);
    expect(data.promoCode.code).toBe('VALID10');
  });

  it('rejects expired promo code (promotion past end date)', async () => {
    const promo = createPromotion(db, tenantId, {
      name: 'Expired Promo',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
      endsAt: '2020-06-01T00:00:00Z', // already expired
    });
    createPromoCode(db, tenantId, {
      promotionId: promo.id,
      code: 'EXPIRED',
    });

    const result = validatePromoCode(db, tenantId, 'EXPIRED');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('expired');
  });

  it('rejects promo code at usage limit', async () => {
    const promo = createPromotion(db, tenantId, {
      name: 'Limited Promo',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
    });
    const codeResult = createPromoCode(db, tenantId, {
      promotionId: promo.id,
      code: 'LIMIT1',
      usageLimit: 1,
    });
    const code = (codeResult as { data: schema.PromoCode }).data;

    // Manually set usage count to limit
    db.update(schema.promoCodes)
      .set({ usageCount: 1 })
      .where(eq(schema.promoCodes.id, code.id))
      .run();

    const result = validatePromoCode(db, tenantId, 'LIMIT1');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('usage limit');
  });

  it('applies percentage discount correctly', async () => {
    const promo = createPromotion(db, tenantId, {
      name: '20% Off',
      type: 'percentage',
      discountValue: 20,
      startsAt: '2020-01-01T00:00:00Z',
    });

    const discount = applyPromotion(promo, 50.0);
    expect(discount).toBe(10.0); // 20% of 50
  });

  it('applies fixed discount correctly (capped at order total)', async () => {
    const promo = createPromotion(db, tenantId, {
      name: '$100 Off',
      type: 'fixed_amount',
      discountValue: 100,
      startsAt: '2020-01-01T00:00:00Z',
    });

    // Discount exceeds order total, should be capped
    const discount = applyPromotion(promo, 33.0);
    expect(discount).toBe(33.0); // capped at order total
  });

  it('createOrder with valid promo code applies discount', async () => {
    const promo = createPromotion(db, tenantId, {
      name: '10% Off',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
      endsAt: '2099-12-31T23:59:59Z',
    });
    createPromoCode(db, tenantId, {
      promotionId: promo.id,
      code: 'SAVE10',
    });

    const result = await createOrder(db,tenantId, {
      tableNumber: '5',
      items: [
        { menuItemId: itemA.id, quantity: 2 }, // 12.50 * 2 = 25.00
        { menuItemId: itemB.id, quantity: 1 }, //  8.00 * 1 =  8.00
      ],
      promoCode: 'SAVE10',
    });

    expect(result).toHaveProperty('data');
    const order = (result as { data: { total: number; discountAmount: number | null } }).data;
    // Total before discount: 33.00, 10% = 3.30, final = 29.70
    expect(order.discountAmount).toBe(3.3);
    expect(order.total).toBe(29.7);
  });

  it('promo code usage count increments after order', async () => {
    const promo = createPromotion(db, tenantId, {
      name: 'Track Usage',
      type: 'percentage',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
      endsAt: '2099-12-31T23:59:59Z',
    });
    const codeResult = createPromoCode(db, tenantId, {
      promotionId: promo.id,
      code: 'TRACK',
    });
    const promoCode = (codeResult as { data: schema.PromoCode }).data;

    // Place an order with the promo code
    await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
      promoCode: 'TRACK',
    });

    // Check that usage count incremented
    const codes = getPromoCodes(db, tenantId, promo.id);
    const updatedCode = codes.find((c) => c.id === promoCode.id);
    expect(updatedCode).toBeDefined();
    expect(updatedCode!.usageCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Combo Deals
// ---------------------------------------------------------------------------

describe('Combo Deals', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;
  let burgerItem: schema.MenuItem;
  let friesItem: schema.MenuItem;
  let colaItem: schema.MenuItem;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
    const cat = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = cat.id;
    const drinksCat = createCategory(db, tenantId, { name: 'Drinks' });

    const burgerResult = createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Burger',
      price: 15,
    });
    const friesResult = createMenuItem(db, tenantId, {
      categoryId: cat.id,
      name: 'Fries',
      price: 6,
    });
    const colaResult = createMenuItem(db, tenantId, {
      categoryId: drinksCat.id,
      name: 'Cola',
      price: 4,
    });

    burgerItem = (burgerResult as { data: schema.MenuItem }).data;
    friesItem = (friesResult as { data: schema.MenuItem }).data;
    colaItem = (colaResult as { data: schema.MenuItem }).data;
  });

  it('creates a combo deal with slots and options', async () => {
    const result = createComboDeal(db, tenantId, {
      name: 'Lunch Combo',
      description: 'Burger + Side + Drink',
      basePrice: 18,
      categoryId,
      slots: [
        {
          name: 'Choose your Main',
          options: [{ menuItemId: burgerItem.id }],
        },
        {
          name: 'Choose your Side',
          options: [{ menuItemId: friesItem.id }],
        },
        {
          name: 'Choose your Drink',
          options: [{ menuItemId: colaItem.id }],
        },
      ],
    });

    expect(result).toHaveProperty('data');
    const deal = (result as { data: { name: string; basePrice: number; slots: unknown[] } }).data;
    expect(deal.name).toBe('Lunch Combo');
    expect(deal.basePrice).toBe(18);
    expect(deal.slots).toHaveLength(3);
  });

  it('lists active combos with nested slots and options', async () => {
    createComboDeal(db, tenantId, {
      name: 'Combo A',
      basePrice: 15,
      slots: [
        {
          name: 'Main',
          options: [{ menuItemId: burgerItem.id }],
        },
      ],
    });
    createComboDeal(db, tenantId, {
      name: 'Combo B',
      basePrice: 20,
      slots: [
        {
          name: 'Main',
          options: [{ menuItemId: burgerItem.id }],
        },
        {
          name: 'Side',
          options: [{ menuItemId: friesItem.id }],
        },
      ],
    });

    const combos = getComboDeals(db, tenantId);
    expect(combos).toHaveLength(2);

    const comboB = combos.find((c) => c.name === 'Combo B');
    expect(comboB).toBeDefined();
    expect(comboB!.slots).toHaveLength(2);
    expect(comboB!.slots[0].options).toHaveLength(1);
  });

  it('soft deletes a combo', async () => {
    const result = createComboDeal(db, tenantId, {
      name: 'ToDelete',
      basePrice: 10,
      slots: [
        {
          name: 'Main',
          options: [{ menuItemId: burgerItem.id }],
        },
      ],
    });
    const deal = (result as { data: { id: string } }).data;

    const deleted = deleteComboDeal(db, tenantId, deal.id);
    expect(deleted).toBeDefined();
    expect(deleted!.isActive).toBe(0);

    const combos = getComboDeals(db, tenantId);
    expect(combos.find((c) => c.id === deal.id)).toBeUndefined();
  });

  it('getPublicCombos returns combos with item details', async () => {
    createComboDeal(db, tenantId, {
      name: 'Public Combo',
      basePrice: 18,
      slots: [
        {
          name: 'Main',
          options: [
            { menuItemId: burgerItem.id, priceModifier: 0 },
          ],
        },
        {
          name: 'Side',
          options: [
            { menuItemId: friesItem.id, priceModifier: 0 },
          ],
        },
      ],
    });

    const publicCombos = getPublicCombos(db, tenantId);
    expect(publicCombos).toHaveLength(1);
    expect(publicCombos[0].name).toBe('Public Combo');
    expect(publicCombos[0].slots).toHaveLength(2);

    const mainSlot = publicCombos[0].slots.find((s) => s.name === 'Main');
    expect(mainSlot).toBeDefined();
    expect(mainSlot!.options).toHaveLength(1);
    expect(mainSlot!.options[0].menuItemName).toBe('Burger');
    expect(mainSlot!.options[0].menuItemPrice).toBe(15);
  });

  it('createOrder with combo items calculates correct total (basePrice + priceModifiers)', async () => {
    const comboResult = createComboDeal(db, tenantId, {
      name: 'Lunch Special',
      basePrice: 18,
      slots: [
        {
          name: 'Main',
          options: [
            { menuItemId: burgerItem.id, priceModifier: 0 },
          ],
        },
        {
          name: 'Side',
          options: [
            { menuItemId: friesItem.id, priceModifier: 0 },
          ],
        },
        {
          name: 'Drink',
          options: [
            { menuItemId: colaItem.id, priceModifier: 0 },
          ],
        },
      ],
    });
    const combo = (comboResult as { data: { id: string; slots: Array<{ id: string; name: string; options: Array<{ menuItemId: string }> }> } }).data;

    const mainSlot = combo.slots.find((s) => s.name === 'Main')!;
    const sideSlot = combo.slots.find((s) => s.name === 'Side')!;
    const drinkSlot = combo.slots.find((s) => s.name === 'Drink')!;

    const orderResult = await createOrder(db,tenantId, {
      tableNumber: '3',
      items: [],
      comboItems: [
        {
          comboDealId: combo.id,
          quantity: 1,
          selections: [
            { slotId: mainSlot.id, menuItemId: burgerItem.id },
            { slotId: sideSlot.id, menuItemId: friesItem.id },
            { slotId: drinkSlot.id, menuItemId: colaItem.id },
          ],
        },
      ],
    });

    expect(orderResult).toHaveProperty('data');
    const order = (orderResult as { data: { total: number; items: schema.OrderItem[] } }).data;
    // basePrice (18) + no price modifiers = 18
    expect(order.total).toBe(18);
    // Each slot selection creates an order item
    expect(order.items).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Order Modifications
// ---------------------------------------------------------------------------

describe('Order Modifications', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;

  function createTestItem(name: string, price: number) {
    const result = createMenuItem(db, tenantId, { categoryId, name, price });
    return (result as { data: schema.MenuItem }).data;
  }

  async function placeTestOrder(items: Array<{ menuItemId: string; quantity: number }>) {
    const result = await createOrder(db,tenantId, {
      tableNumber: '1',
      items,
    });
    return (result as { data: { id: string; total: number; status: string; items: schema.OrderItem[] } }).data;
  }

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
    const category = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = category.id;
  });

  describe('addItemsToOrder', () => {
    it('adds items to an existing pending order and updates total', async () => {
      const burger = createTestItem('Burger', 15);
      const fries = createTestItem('Fries', 5);

      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);
      expect(order.total).toBe(15);
      expect(order.items).toHaveLength(1);

      const result = addItemsToOrder(db, tenantId, order.id, [
        { menuItemId: fries.id, quantity: 2 },
      ]);

      expect(result).toHaveProperty('data');
      const updated = (result as { data: { total: number; items: schema.OrderItem[] } }).data;
      expect(updated.items).toHaveLength(2);
      expect(updated.total).toBe(25); // 15 + 5*2
    });

    it('rejects adding items to a delivered order', async () => {
      const burger = createTestItem('Burger', 15);
      const fries = createTestItem('Fries', 5);

      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);
      updateOrderStatus(db, tenantId, order.id, 'delivered');

      const result = addItemsToOrder(db, tenantId, order.id, [
        { menuItemId: fries.id, quantity: 1 },
      ]);

      expect(result).toHaveProperty('error');
    });

    it('rejects adding items to a cancelled order', async () => {
      const burger = createTestItem('Burger', 15);
      const fries = createTestItem('Fries', 5);

      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);
      updateOrderStatus(db, tenantId, order.id, 'cancelled');

      const result = addItemsToOrder(db, tenantId, order.id, [
        { menuItemId: fries.id, quantity: 1 },
      ]);

      expect(result).toHaveProperty('error');
    });

    it('allows adding items to a confirmed order', async () => {
      const burger = createTestItem('Burger', 15);
      const fries = createTestItem('Fries', 5);

      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);
      updateOrderStatus(db, tenantId, order.id, 'confirmed');

      const result = addItemsToOrder(db, tenantId, order.id, [
        { menuItemId: fries.id, quantity: 1 },
      ]);

      expect(result).toHaveProperty('data');
      const updated = (result as { data: { total: number } }).data;
      expect(updated.total).toBe(20);
    });

    it('rejects adding unavailable items', async () => {
      const burger = createTestItem('Burger', 15);
      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);

      // Mark burger as unavailable
      updateMenuItem(db, tenantId, burger.id, { isAvailable: 0 });

      const result = addItemsToOrder(db, tenantId, order.id, [
        { menuItemId: burger.id, quantity: 1 },
      ]);

      expect(result).toHaveProperty('error');
    });

    it('rejects when order does not belong to tenant', async () => {
      const otherTenant = createTestTenant(db, 'other-tenant');
      const burger = createTestItem('Burger', 15);

      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);

      const result = addItemsToOrder(db, otherTenant.id, order.id, [
        { menuItemId: burger.id, quantity: 1 },
      ]);

      expect(result).toHaveProperty('error', 'Order not found');
    });
  });

  describe('requestItemCancellation', () => {
    it('marks items as cancel_requested', async () => {
      const burger = createTestItem('Burger', 15);
      const fries = createTestItem('Fries', 5);

      const order = await placeTestOrder([
        { menuItemId: burger.id, quantity: 1 },
        { menuItemId: fries.id, quantity: 1 },
      ]);

      const itemToCancel = order.items[0];
      const result = requestItemCancellation(db, tenantId, order.id, [itemToCancel.id]);

      expect(result).toHaveProperty('data');
      const updated = (result as { data: { items: Array<{ id: string; status: string }> } }).data;
      const cancelledItem = updated.items.find((i) => i.id === itemToCancel.id);
      expect(cancelledItem?.status).toBe('cancel_requested');

      // Other item should still be active
      const otherItem = updated.items.find((i) => i.id !== itemToCancel.id);
      expect(otherItem?.status).toBe('active');
    });

    it('rejects cancellation for non-active items', async () => {
      const burger = createTestItem('Burger', 15);
      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);

      // Request once
      requestItemCancellation(db, tenantId, order.id, [order.items[0].id]);

      // Request again should fail
      const result = requestItemCancellation(db, tenantId, order.id, [order.items[0].id]);
      expect(result).toHaveProperty('error');
    });

    it('rejects cancellation for delivered orders', async () => {
      const burger = createTestItem('Burger', 15);
      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);

      updateOrderStatus(db, tenantId, order.id, 'delivered');

      const result = requestItemCancellation(db, tenantId, order.id, [order.items[0].id]);
      expect(result).toHaveProperty('error');
    });
  });

  describe('handleCancellationRequest', () => {
    it('approves cancellation and recalculates total', async () => {
      const burger = createTestItem('Burger', 15);
      const fries = createTestItem('Fries', 5);

      const order = await placeTestOrder([
        { menuItemId: burger.id, quantity: 1 },
        { menuItemId: fries.id, quantity: 2 },
      ]);
      expect(order.total).toBe(25); // 15 + 5*2

      // Request cancellation of the burger
      requestItemCancellation(db, tenantId, order.id, [order.items[0].id]);

      // Staff approves
      const result = handleCancellationRequest(db, tenantId, order.id, order.items[0].id, 'approve');

      expect(result).toHaveProperty('data');
      const updated = (result as { data: { total: number; items: Array<{ id: string; status: string }> } }).data;

      const cancelledItem = updated.items.find((i) => i.id === order.items[0].id);
      expect(cancelledItem?.status).toBe('cancelled');

      // Total should now be just fries: 5*2 = 10
      expect(updated.total).toBe(10);
    });

    it('rejects cancellation and keeps item active', async () => {
      const burger = createTestItem('Burger', 15);
      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);

      requestItemCancellation(db, tenantId, order.id, [order.items[0].id]);

      const result = handleCancellationRequest(db, tenantId, order.id, order.items[0].id, 'reject');

      expect(result).toHaveProperty('data');
      const updated = (result as { data: { total: number; items: Array<{ id: string; status: string }> } }).data;

      const item = updated.items.find((i) => i.id === order.items[0].id);
      expect(item?.status).toBe('active');
      expect(updated.total).toBe(15); // unchanged
    });

    it('rejects handling for items not in cancel_requested state', async () => {
      const burger = createTestItem('Burger', 15);
      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);

      // Try to handle without a cancellation request
      const result = handleCancellationRequest(db, tenantId, order.id, order.items[0].id, 'approve');
      expect(result).toHaveProperty('error');
    });

    it('prevents cross-tenant cancellation handling', async () => {
      const otherTenant = createTestTenant(db, 'other-tenant');
      const burger = createTestItem('Burger', 15);
      const order = await placeTestOrder([{ menuItemId: burger.id, quantity: 1 }]);

      requestItemCancellation(db, tenantId, order.id, [order.items[0].id]);

      const result = handleCancellationRequest(db, otherTenant.id, order.id, order.items[0].id, 'approve');
      expect(result).toHaveProperty('error', 'Order not found');
    });
  });
});

// ---------------------------------------------------------------------------
// Tax Calculation
// ---------------------------------------------------------------------------

describe('Tax Calculation', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;

  function createTestItem(name: string, price: number) {
    const result = createMenuItem(db, tenantId, { categoryId, name, price });
    return (result as { data: schema.MenuItem }).data;
  }

  function setTaxSettings(tid: string, taxRate: number, taxInclusive: boolean) {
    db.update(schema.tenants)
      .set({ settings: JSON.stringify({ taxRate, taxInclusive }) })
      .where(eq(schema.tenants.id, tid))
      .run();
  }

  async function placeOrder(
    items: Array<{ menuItemId: string; quantity: number }>,
    promoCode?: string,
  ) {
    const result = await createOrder(db,tenantId, {
      tableNumber: '1',
      items,
      ...(promoCode ? { promoCode } : {}),
    });
    return (result as { data: { total: number; taxAmount: number | null; discountAmount: number | null } }).data;
  }

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'tax-test');
    tenantId = tenant.id;
    const category = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = category.id;
  });

  it('applies 10% exclusive tax: taxAmount = subtotal * 0.10, total = subtotal + taxAmount', async () => {
    setTaxSettings(tenantId, 10, false);
    const item = createTestItem('Steak', 100);

    const order = await placeOrder([{ menuItemId: item.id, quantity: 1 }]);

    // subtotal = 100.00, tax = 100 * 10% = 10.00, total = 110.00
    expect(order.taxAmount).toBe(10.0);
    expect(order.total).toBe(110.0);
  });

  it('applies 15% inclusive tax: taxAmount extracted from price-inclusive total, total unchanged', async () => {
    setTaxSettings(tenantId, 15, true);
    // Item price is $23.00 — tax is already baked in
    const item = createTestItem('GST Burger', 23);

    const order = await placeOrder([{ menuItemId: item.id, quantity: 1 }]);

    // subtotal = 23.00
    // taxAmount = 23.00 - (23.00 / 1.15) = 23.00 - 20.00 = 3.00
    // total stays 23.00 (tax is included, not added on top)
    expect(order.taxAmount).toBe(3.0);
    expect(order.total).toBe(23.0);
  });

  it('applies 0% tax: taxAmount = 0, total = subtotal', async () => {
    setTaxSettings(tenantId, 0, false);
    const item = createTestItem('Burger', 12.5);

    const order = await placeOrder([{ menuItemId: item.id, quantity: 2 }]);

    // subtotal = 25.00, no tax
    expect(order.taxAmount).toBe(0);
    expect(order.total).toBe(25.0);
  });

  it('no tax configured: taxAmount = 0 (default settings)', async () => {
    // tenant settings stays as default '{}' — no taxRate set
    const item = createTestItem('Chips', 8);

    const order = await placeOrder([{ menuItemId: item.id, quantity: 1 }]);

    expect(order.taxAmount).toBe(0);
    expect(order.total).toBe(8.0);
  });

  it('rounds taxAmount to 2 decimal places (e.g. $10.99 * 10% = $1.10 not $1.099)', async () => {
    setTaxSettings(tenantId, 10, false);
    const item = createTestItem('Special', 10.99);

    const order = await placeOrder([{ menuItemId: item.id, quantity: 1 }]);

    // subtotal = 10.99, tax = 10.99 * 0.10 = 1.099 → rounded to 1.10
    expect(order.taxAmount).toBe(1.10);
    expect(order.total).toBe(12.09);
  });

  it('applies discount before tax: tax is calculated on (subtotal - discount)', async () => {
    setTaxSettings(tenantId, 10, false);

    // Set up a 10-off promotion + promo code
    const promotion = db.insert(schema.promotions).values({
      tenantId,
      name: '$10 Off',
      type: 'fixed',
      discountValue: 10,
      startsAt: '2020-01-01T00:00:00Z',
      isActive: 1,
    }).returning().get();

    db.insert(schema.promoCodes).values({
      tenantId,
      promotionId: promotion.id,
      code: 'TAX10',
      isActive: 1,
    }).run();

    const item = createTestItem('Pasta', 50);

    const result = await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: item.id, quantity: 1 }],
      promoCode: 'TAX10',
    });
    const order = (result as { data: { total: number; taxAmount: number | null; discountAmount: number | null } }).data;

    // subtotal = 50.00, discount = 10.00, subtotalAfterDiscount = 40.00
    // tax = 40.00 * 10% = 4.00
    // total = 40.00 + 4.00 = 44.00
    expect(order.discountAmount).toBe(10.0);
    expect(order.taxAmount).toBe(4.0);
    expect(order.total).toBe(44.0);
  });

  it('tenant A taxRate does not affect tenant B order (tenant isolation)', async () => {
    // Tenant A: 20% tax
    setTaxSettings(tenantId, 20, false);

    // Tenant B: no tax
    const tenantB = createTestTenant(db, 'tax-test-b');
    const catB = createCategory(db, tenantB.id, { name: 'Food' });
    const itemB = (createMenuItem(db, tenantB.id, { categoryId: catB.id, name: 'Soup', price: 10 }) as { data: schema.MenuItem }).data;

    const resultB = await createOrder(db,tenantB.id, {
      tableNumber: '2',
      items: [{ menuItemId: itemB.id, quantity: 1 }],
    });
    const orderB = (resultB as { data: { total: number; taxAmount: number | null } }).data;

    // Tenant B has no tax configured — its order must not be affected by Tenant A's rate
    expect(orderB.taxAmount).toBe(0);
    expect(orderB.total).toBe(10.0);
  });

  it('multi-item order sums correctly with exclusive tax', async () => {
    setTaxSettings(tenantId, 10, false);
    const burger = createTestItem('Burger', 12.5);
    const fries = createTestItem('Fries', 8.0);

    const order = await placeOrder([
      { menuItemId: burger.id, quantity: 2 }, // 12.50 * 2 = 25.00
      { menuItemId: fries.id, quantity: 1 },  // 8.00  * 1 = 8.00
    ]);

    // subtotal = 33.00, tax = 33.00 * 10% = 3.30, total = 36.30
    expect(order.taxAmount).toBe(3.30);
    expect(order.total).toBe(36.30);
  });
});

// ---------------------------------------------------------------------------
// Allergen Management
// NOTE: allergens are stored as a comma-separated string in the DB, not an
// array. createMenuItem/updateMenuItem accept `allergens?: string`.
// getPublicMenu returns the raw DB value — callers must split the string.
// ---------------------------------------------------------------------------

describe('Allergen Management', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
    const category = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = category.id;
  });

  it('menu item created with allergens stores the comma-separated string', async () => {
    const result = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Pasta',
      price: 18,
      allergens: 'gluten,dairy',
    });

    expect(result).toHaveProperty('data');
    const item = (result as { data: schema.MenuItem }).data;
    // DB stores allergens as a raw comma-separated string
    expect(item.allergens).toBe('gluten,dairy');
  });

  it('getPublicMenu returns allergens as a string that can be split into an array', async () => {
    const result = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Cheesy Burger',
      price: 16,
      allergens: 'gluten,dairy,eggs',
    });
    expect(result).toHaveProperty('data');

    const { categories: menu } = getPublicMenu(db, tenantId);
    expect(menu).toHaveLength(1);
    expect(menu[0].items).toHaveLength(1);

    const publicItem = menu[0].items[0];
    // allergens is a comma-separated string in the DB — callers split to get an array
    expect(typeof publicItem.allergens).toBe('string');
    const allergensArray = (publicItem.allergens as string).split(',');
    expect(allergensArray).toEqual(['gluten', 'dairy', 'eggs']);
  });

  it('getPublicMenu item with no allergens returns null from the DB', async () => {
    createMenuItem(db, tenantId, {
      categoryId,
      name: 'Plain Rice',
      price: 6,
      // allergens not set
    });

    const { categories: menu } = getPublicMenu(db, tenantId);
    expect(menu).toHaveLength(1);
    const publicItem = menu[0].items[0];
    // When no allergens are stored the column is NULL
    expect(publicItem.allergens).toBeNull();
  });

  it('updateMenuItem can set allergens on an existing item', async () => {
    const result = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Soy Noodles',
      price: 14,
    });
    const item = (result as { data: schema.MenuItem }).data;
    expect(item.allergens).toBeNull();

    const updateResult = updateMenuItem(db, tenantId, item.id, {
      allergens: 'soy,gluten',
    });
    expect(updateResult).toHaveProperty('data');
    const updated = (updateResult as { data: schema.MenuItem }).data;
    expect(updated.allergens).toBe('soy,gluten');
  });

  it('allergens are tenant-isolated — tenant B cannot see tenant A allergen data', async () => {
    const tenantB = createTestTenant(db, 'tenant-b');
    const catB = createCategory(db, tenantB.id, { name: 'B Mains' });

    // Tenant A item has allergens
    createMenuItem(db, tenantId, {
      categoryId,
      name: 'A Burger',
      price: 12,
      allergens: 'gluten,dairy',
    });
    // Tenant B item has different allergens
    createMenuItem(db, tenantB.id, {
      categoryId: catB.id,
      name: 'B Salad',
      price: 10,
      allergens: 'nuts',
    });

    const { categories: menuA } = getPublicMenu(db, tenantId);
    const { categories: menuB } = getPublicMenu(db, tenantB.id);

    expect(menuA).toHaveLength(1);
    expect(menuA[0].items[0].allergens).toBe('gluten,dairy');

    expect(menuB).toHaveLength(1);
    expect(menuB[0].items[0].allergens).toBe('nuts');

    // Confirm no cross-tenant leak: Tenant A sees only 1 item, Tenant B sees only 1 item
    const allItemsA = menuA.flatMap((cat) => cat.items);
    const allItemsB = menuB.flatMap((cat) => cat.items);
    expect(allItemsA).toHaveLength(1);
    expect(allItemsB).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Analytics Service
// ---------------------------------------------------------------------------

describe('Analytics Service', () => {
  let db: TestDB;
  let tenantId: string;
  let categoryId: string;
  let itemA: schema.MenuItem;
  let itemB: schema.MenuItem;

  beforeEach(() => {
    db = createTestDb();
    const tenant = createTestTenant(db, 'test-tenant');
    tenantId = tenant.id;
    const cat = createCategory(db, tenantId, { name: 'Mains' });
    categoryId = cat.id;
    const resultA = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Burger',
      price: 15,
    });
    const resultB = createMenuItem(db, tenantId, {
      categoryId,
      name: 'Fries',
      price: 5,
    });
    itemA = (resultA as { data: schema.MenuItem }).data;
    itemB = (resultB as { data: schema.MenuItem }).data;
  });

  it('getDailyRevenue returns an array with date, revenue, orderCount, and avgOrderValue fields', async () => {
    await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '2',
      items: [{ menuItemId: itemB.id, quantity: 2 }],
    });

    const result = getDailyRevenue(db, tenantId, 30);

    expect(Array.isArray(result)).toBe(true);
    // At least today's row must be present
    expect(result.length).toBeGreaterThanOrEqual(1);

    const today = result[result.length - 1];
    expect(today).toHaveProperty('date');
    expect(today).toHaveProperty('revenue');
    expect(today).toHaveProperty('orderCount');
    expect(today).toHaveProperty('avgOrderValue');

    // Two orders: Burger ($15) + 2×Fries ($10) = $25 total revenue
    expect(today.orderCount).toBe(2);
    expect(today.revenue).toBe(25);
    expect(today.avgOrderValue).toBe(12.5);
  });

  it('getDailyRevenue returns empty array when tenant has no orders', async () => {
    const result = getDailyRevenue(db, tenantId, 30);
    expect(result).toEqual([]);
  });

  it('getTopItems returns items sorted by revenue descending', async () => {
    // Place: 3× Burger ($15 each = $45), 5× Fries ($5 each = $25)
    await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 3 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '2',
      items: [{ menuItemId: itemB.id, quantity: 5 }],
    });

    const topItems = getTopItems(db, tenantId, 10);

    expect(Array.isArray(topItems)).toBe(true);
    expect(topItems.length).toBeGreaterThanOrEqual(2);

    // Each entry must have the expected fields
    for (const row of topItems) {
      expect(row).toHaveProperty('menuItemId');
      expect(row).toHaveProperty('name');
      expect(row).toHaveProperty('quantity');
      expect(row).toHaveProperty('revenue');
    }

    // Burger has higher revenue ($45) — should be first
    expect(topItems[0].name).toBe('Burger');
    expect(topItems[0].quantity).toBe(3);
    expect(topItems[0].revenue).toBe(45);

    expect(topItems[1].name).toBe('Fries');
    expect(topItems[1].quantity).toBe(5);
    expect(topItems[1].revenue).toBe(25);
  });

  it('getTopItems returns empty array when tenant has no orders', async () => {
    const result = getTopItems(db, tenantId, 10);
    expect(result).toEqual([]);
  });

  it('getOrderStats returns today/week/month/allTime with revenue and count', async () => {
    await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    await createOrder(db,tenantId, {
      tableNumber: '2',
      items: [{ menuItemId: itemB.id, quantity: 2 }],
    });

    const stats = getOrderStats(db, tenantId);

    expect(stats).toHaveProperty('today');
    expect(stats).toHaveProperty('week');
    expect(stats).toHaveProperty('month');
    expect(stats).toHaveProperty('allTime');

    for (const period of [stats.today, stats.week, stats.month, stats.allTime]) {
      expect(period).toHaveProperty('revenue');
      expect(period).toHaveProperty('count');
      expect(typeof period.revenue).toBe('number');
      expect(typeof period.count).toBe('number');
    }

    // Both orders were just created, so all periods should reflect them
    expect(stats.today.count).toBe(2);
    expect(stats.today.revenue).toBe(25); // $15 + $10
    expect(stats.allTime.count).toBe(2);
    expect(stats.allTime.revenue).toBe(25);
  });

  it('getStatusBreakdown returns a record keyed by status', async () => {
    const r1 = await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    const r2 = await createOrder(db,tenantId, {
      tableNumber: '2',
      items: [{ menuItemId: itemB.id, quantity: 1 }],
    });
    const id1 = (r1 as { data: { id: string } }).data.id;
    const id2 = (r2 as { data: { id: string } }).data.id;

    updateOrderStatus(db, tenantId, id1, 'confirmed');
    // id2 stays 'pending'

    const breakdown = getStatusBreakdown(db, tenantId);

    expect(breakdown).toHaveProperty('pending');
    expect(breakdown).toHaveProperty('confirmed');
    expect(breakdown['pending']).toBe(1);
    expect(breakdown['confirmed']).toBe(1);
  });

  it('analytics only returns data for the requesting tenant', async () => {
    const tenantB = createTestTenant(db, 'tenant-b');
    const catB = createCategory(db, tenantB.id, { name: 'B Mains' });
    const itemBResult = createMenuItem(db, tenantB.id, {
      categoryId: catB.id,
      name: 'B Burger',
      price: 20,
    });
    const itemBData = (itemBResult as { data: schema.MenuItem }).data;

    // Tenant A: 1 order for $15
    await createOrder(db,tenantId, {
      tableNumber: '1',
      items: [{ menuItemId: itemA.id, quantity: 1 }],
    });
    // Tenant B: 1 order for $20
    await createOrder(db,tenantB.id, {
      tableNumber: '2',
      items: [{ menuItemId: itemBData.id, quantity: 1 }],
    });

    const statsA = getOrderStats(db, tenantId);
    const statsB = getOrderStats(db, tenantB.id);

    // Tenant A sees only its own order ($15)
    expect(statsA.allTime.count).toBe(1);
    expect(statsA.allTime.revenue).toBe(15);

    // Tenant B sees only its own order ($20)
    expect(statsB.allTime.count).toBe(1);
    expect(statsB.allTime.revenue).toBe(20);

    // Top items isolation
    const topA = getTopItems(db, tenantId, 10);
    const topB = getTopItems(db, tenantB.id, 10);

    expect(topA).toHaveLength(1);
    expect(topA[0].name).toBe('Burger');

    expect(topB).toHaveLength(1);
    expect(topB[0].name).toBe('B Burger');
  });
});
