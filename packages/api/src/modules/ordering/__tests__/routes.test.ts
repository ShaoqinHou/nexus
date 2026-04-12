import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as schema from '../../../db/schema';
import { platformRoutes } from '../../../routes/platform';
import { staffRoutes } from '../../../routes/staff';
import { tenantMiddleware } from '../../../middleware/tenant';
import { staffOrderingRoutes, customerOrderingRoutes } from '../routes';
import type { TenantEnv } from '../../../lib/types';

// Use the same secret as auth middleware defaults to
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

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
  `);

  return drizzle(sqlite, { schema });
}

// --- Helpers ---

function createTestTenant(db: TestDB, slug: string) {
  return db
    .insert(schema.tenants)
    .values({ name: `Tenant ${slug}`, slug })
    .returning()
    .get();
}

async function createTestStaff(
  db: TestDB,
  tenantId: string,
  overrides: { email?: string; name?: string; role?: string; password?: string } = {}
) {
  const email = overrides.email ?? 'owner@test.com';
  const password = overrides.password ?? 'password123';
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed
  return db
    .insert(schema.staff)
    .values({
      tenantId,
      email,
      passwordHash,
      name: overrides.name ?? 'Test Owner',
      role: overrides.role ?? 'owner',
    })
    .returning()
    .get();
}

function signToken(staffId: string, tenantId: string) {
  return jwt.sign({ staffId, tenantId }, JWT_SECRET, { expiresIn: '1h' });
}

function createTestApp(db: TestDB) {
  const app = new Hono();

  // Platform routes (no tenant middleware)
  app.route('/api/platform', platformRoutes(db));

  // Tenant-scoped staff routes
  const tenantApp = new Hono<TenantEnv>();
  tenantApp.use('*', tenantMiddleware(db));
  tenantApp.route('/ordering', staffOrderingRoutes(db));
  tenantApp.route('/staff', staffRoutes(db));
  app.route('/api/t/:tenantSlug', tenantApp);

  // Customer-facing routes
  const customerApp = new Hono<TenantEnv>();
  customerApp.use('*', tenantMiddleware(db));
  customerApp.route('/ordering', customerOrderingRoutes(db));
  app.route('/api/order/:tenantSlug', customerApp);

  return app;
}

function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost${url}`, init);
}

// ---------------------------------------------------------------------------
// Platform / Auth Routes
// ---------------------------------------------------------------------------

describe('Platform routes', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    db = createTestDb();
    app = createTestApp(db);
  });

  it('GET /api/platform/health returns 200', async () => {
    const res = await app.request('/api/platform/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('POST /api/platform/auth/register creates tenant + owner', async () => {
    const res = await app.request(
      jsonRequest('/api/platform/auth/register', 'POST', {
        name: 'My Restaurant',
        slug: 'my-restaurant',
        email: 'owner@example.com',
        password: 'securepass123',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user.email).toBe('owner@example.com');
    expect(body.user.role).toBe('owner');
    expect(body.tenant.slug).toBe('my-restaurant');
  });

  it('POST /api/platform/auth/register rejects duplicate slug', async () => {
    // Create first tenant
    await app.request(
      jsonRequest('/api/platform/auth/register', 'POST', {
        name: 'First', slug: 'taken-slug', email: 'a@b.com', password: 'password123',
      })
    );
    // Attempt duplicate
    const res = await app.request(
      jsonRequest('/api/platform/auth/register', 'POST', {
        name: 'Second', slug: 'taken-slug', email: 'c@d.com', password: 'password123',
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already taken');
  });

  it('POST /api/platform/auth/login returns token for valid credentials', async () => {
    // Register first
    await app.request(
      jsonRequest('/api/platform/auth/register', 'POST', {
        name: 'Login Test', slug: 'login-test', email: 'user@test.com', password: 'password123',
      })
    );
    // Login
    const res = await app.request(
      jsonRequest('/api/platform/auth/login', 'POST', {
        email: 'user@test.com', password: 'password123', tenantSlug: 'login-test',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user.email).toBe('user@test.com');
  });

  it('POST /api/platform/auth/login returns 401 for wrong password', async () => {
    await app.request(
      jsonRequest('/api/platform/auth/register', 'POST', {
        name: 'Auth Test', slug: 'auth-test', email: 'user@test.com', password: 'rightpassword',
      })
    );
    const res = await app.request(
      jsonRequest('/api/platform/auth/login', 'POST', {
        email: 'user@test.com', password: 'wrongpassword', tenantSlug: 'auth-test',
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
  });

  it('POST /api/platform/auth/login returns 401 for non-existent tenant', async () => {
    const res = await app.request(
      jsonRequest('/api/platform/auth/login', 'POST', {
        email: 'user@test.com', password: 'anything', tenantSlug: 'no-such-tenant',
      })
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/platform/tenants/:slug returns public tenant info', async () => {
    await app.request(
      jsonRequest('/api/platform/auth/register', 'POST', {
        name: 'Public Info', slug: 'public-info', email: 'a@b.com', password: 'password123',
      })
    );
    const res = await app.request('/api/platform/tenants/public-info');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Public Info');
    expect(body.slug).toBe('public-info');
  });

  it('GET /api/platform/tenants/:slug returns 404 for unknown tenant', async () => {
    const res = await app.request('/api/platform/tenants/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Menu CRUD Routes (Staff)
// ---------------------------------------------------------------------------

describe('Staff ordering routes — categories', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let token: string;
  const SLUG = 'test-restaurant';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id);
    token = signToken(owner.id, tenant.id);
  });

  it('GET /categories returns empty array initially', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('POST /categories creates a category', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: 'Mains', description: 'Main dishes',
      }, { Authorization: `Bearer ${token}` })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Mains');
    expect(body.data.description).toBe('Main dishes');
    expect(body.data.id).toEqual(expect.any(String));
  });

  it('POST /categories rejects empty name', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: '',
      }, { Authorization: `Bearer ${token}` })
    );
    expect(res.status).toBe(400);
  });

  it('GET /categories without auth returns 401', async () => {
    const res = await app.request(`/api/t/${SLUG}/ordering/categories`);
    expect(res.status).toBe(401);
  });

  it('PUT /categories/:id updates a category', async () => {
    // Create
    const createRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: 'Old Name',
      }, { Authorization: `Bearer ${token}` })
    );
    const { data: created } = await createRes.json();

    // Update
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories/${created.id}`, 'PUT', {
        name: 'New Name',
      }, { Authorization: `Bearer ${token}` })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('New Name');
  });

  it('DELETE /categories/:id soft-deletes', async () => {
    const createRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: 'ToDelete',
      }, { Authorization: `Bearer ${token}` })
    );
    const { data: created } = await createRes.json();

    const delRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories/${created.id}`, 'DELETE', undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(delRes.status).toBe(200);

    // Should no longer appear in listing
    const listRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    const { data } = await listRes.json();
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Menu Items Routes (Staff)
// ---------------------------------------------------------------------------

describe('Staff ordering routes — items', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let token: string;
  let categoryId: string;
  const SLUG = 'items-test';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id);
    token = signToken(owner.id, tenant.id);

    // Create a category for items
    const catRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: 'Mains',
      }, { Authorization: `Bearer ${token}` })
    );
    const catBody = await catRes.json();
    categoryId = catBody.data.id;
  });

  it('POST /items creates a menu item', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId,
        name: 'Burger',
        price: 15.50,
        description: 'A good burger',
      }, { Authorization: `Bearer ${token}` })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Burger');
    expect(body.data.price).toBe(15.50);
  });

  it('GET /items lists items', async () => {
    await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId, name: 'Item A', price: 10,
      }, { Authorization: `Bearer ${token}` })
    );
    await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId, name: 'Item B', price: 12,
      }, { Authorization: `Bearer ${token}` })
    );

    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });

  it('POST /items rejects missing required fields', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        name: 'No category or price',
      }, { Authorization: `Bearer ${token}` })
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Customer Ordering Routes
// ---------------------------------------------------------------------------

describe('Customer ordering routes', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let token: string;
  let menuItemId: string;
  const SLUG = 'cust-test';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id);
    token = signToken(owner.id, tenant.id);

    // Seed a category + item via staff routes
    const catRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: 'Food',
      }, { Authorization: `Bearer ${token}` })
    );
    const catBody = await catRes.json();
    const categoryId = catBody.data.id;

    const itemRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId, name: 'Pizza', price: 18,
      }, { Authorization: `Bearer ${token}` })
    );
    const itemBody = await itemRes.json();
    menuItemId = itemBody.data.id;
  });

  it('GET /menu returns public menu without auth', async () => {
    const res = await app.request(`/api/order/${SLUG}/ordering/menu`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.categories).toBeInstanceOf(Array);
  });

  it('POST /orders creates an order (customer, no auth)', async () => {
    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '5',
        items: [{ menuItemId, quantity: 2, notes: 'Extra cheese' }],
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.tableNumber).toBe('5');
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].quantity).toBe(2);
    expect(body.data.total).toBe(36); // 18 * 2
  });

  it('POST /orders rejects empty items', async () => {
    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '1',
        items: [],
      })
    );
    expect(res.status).toBe(400);
  });

  it('GET /orders/:id returns order by id', async () => {
    // Place an order first
    const orderRes = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '3',
        items: [{ menuItemId, quantity: 1 }],
      })
    );
    const { data: order } = await orderRes.json();

    // Retrieve it
    const res = await app.request(`/api/order/${SLUG}/ordering/orders/${order.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(order.id);
    expect(body.data.status).toBe('pending');
  });

  it('GET /orders/:id returns 404 for non-existent order', async () => {
    const res = await app.request(`/api/order/${SLUG}/ordering/orders/nonexistent-id`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Promo Code Routes (Customer)
// ---------------------------------------------------------------------------

describe('Customer promo code validation', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let token: string;
  let menuItemId: string;
  let promoCode: string;
  const SLUG = 'promo-test';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id);
    token = signToken(owner.id, tenant.id);

    // Seed category + item
    const catRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: 'Food',
      }, { Authorization: `Bearer ${token}` })
    );
    const catBody = await catRes.json();

    const itemRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId: catBody.data.id, name: 'Steak', price: 40,
      }, { Authorization: `Bearer ${token}` })
    );
    const itemBody = await itemRes.json();
    menuItemId = itemBody.data.id;

    // Create a promotion + promo code via staff routes
    const promoRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/promotions`, 'POST', {
        name: '20% Off',
        type: 'percentage',
        discountValue: 20,
        startsAt: '2020-01-01T00:00:00Z',
      }, { Authorization: `Bearer ${token}` })
    );
    const promoBody = await promoRes.json();
    const promotionId = promoBody.data.id;

    const codeRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/promotions/${promotionId}/codes`, 'POST', {
        code: 'SAVE20',
      }, { Authorization: `Bearer ${token}` })
    );
    await codeRes.json();
    promoCode = 'SAVE20';
  });

  it('POST /validate-promo validates a promo code', async () => {
    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/validate-promo`, 'POST', {
        code: promoCode,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.code).toBe('SAVE20');
    expect(body.data.type).toBe('percentage');
    expect(body.data.discountValue).toBe(20);
  });

  it('POST /validate-promo returns 400 for invalid code', async () => {
    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/validate-promo`, 'POST', {
        code: 'NOTREAL',
      })
    );
    expect(res.status).toBe(400);
  });

  it('POST /orders with promo code applies discount', async () => {
    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '1',
        items: [{ menuItemId, quantity: 1 }],
        promoCode,
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    // 40 * 1 = 40, 20% off = 8 discount
    expect(body.data.total).toBe(32);
    expect(body.data.discountAmount).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Staff Management Routes
// ---------------------------------------------------------------------------

describe('Staff routes', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let ownerToken: string;
  let staffToken: string;
  const SLUG = 'staff-test';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id, {
      email: 'owner@test.com', role: 'owner',
    });
    ownerToken = signToken(owner.id, tenant.id);

    const staffMember = await createTestStaff(db, tenant.id, {
      email: 'staff@test.com', name: 'Staff Person', role: 'staff',
    });
    staffToken = signToken(staffMember.id, tenant.id);
  });

  it('GET /staff lists staff for owner', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/staff`, 'GET', undefined, {
        Authorization: `Bearer ${ownerToken}`,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2); // owner + staff
    expect(body.data.map((s: { role: string }) => s.role)).toContain('owner');
    expect(body.data.map((s: { role: string }) => s.role)).toContain('staff');
  });

  it('GET /staff returns 403 for staff role', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/staff`, 'GET', undefined, {
        Authorization: `Bearer ${staffToken}`,
      })
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Analytics Role Guard
// ---------------------------------------------------------------------------

describe('Analytics role guard', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let staffToken: string;
  let ownerToken: string;
  const SLUG = 'analytics-test';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id, {
      email: 'owner@test.com', role: 'owner',
    });
    ownerToken = signToken(owner.id, tenant.id);

    const staffMember = await createTestStaff(db, tenant.id, {
      email: 'cook@test.com', name: 'Line Cook', role: 'staff',
    });
    staffToken = signToken(staffMember.id, tenant.id);
  });

  it('staff role cannot access analytics (403)', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/analytics/revenue`, 'GET', undefined, {
        Authorization: `Bearer ${staffToken}`,
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('owner or manager');
  });

  it('owner can access analytics', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/analytics/stats`, 'GET', undefined, {
        Authorization: `Bearer ${ownerToken}`,
      })
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Tenant Isolation
// ---------------------------------------------------------------------------

describe('Tenant isolation', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    db = createTestDb();
    app = createTestApp(db);
  });

  it('tenant A categories are not visible to tenant B', async () => {
    // Set up tenant A
    const tenantA = createTestTenant(db, 'tenant-a');
    const ownerA = await createTestStaff(db, tenantA.id, { email: 'a@a.com' });
    const tokenA = signToken(ownerA.id, tenantA.id);

    // Set up tenant B
    const tenantB = createTestTenant(db, 'tenant-b');
    const ownerB = await createTestStaff(db, tenantB.id, { email: 'b@b.com' });
    const tokenB = signToken(ownerB.id, tenantB.id);

    // Create category in tenant A
    await app.request(
      jsonRequest('/api/t/tenant-a/ordering/categories', 'POST', {
        name: 'A-Only Category',
      }, { Authorization: `Bearer ${tokenA}` })
    );

    // List in tenant B — should be empty
    const res = await app.request(
      jsonRequest('/api/t/tenant-b/ordering/categories', 'GET', undefined, {
        Authorization: `Bearer ${tokenB}`,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it('token from tenant A cannot access tenant B routes', async () => {
    const tenantA = createTestTenant(db, 'tenant-a2');
    const ownerA = await createTestStaff(db, tenantA.id, { email: 'a@a.com' });
    const tokenA = signToken(ownerA.id, tenantA.id);

    createTestTenant(db, 'tenant-b2');

    const res = await app.request(
      jsonRequest('/api/t/tenant-b2/ordering/categories', 'GET', undefined, {
        Authorization: `Bearer ${tokenA}`,
      })
    );
    // Auth middleware verifies token tenant matches URL tenant
    expect(res.status).toBe(401);
  });

  it('customer menu for tenant A does not include tenant B items', async () => {
    const tenantA = createTestTenant(db, 'iso-a');
    const ownerA = await createTestStaff(db, tenantA.id, { email: 'a@a.com' });
    const tokenA = signToken(ownerA.id, tenantA.id);

    const tenantB = createTestTenant(db, 'iso-b');
    const ownerB = await createTestStaff(db, tenantB.id, { email: 'b@b.com' });
    const tokenB = signToken(ownerB.id, tenantB.id);

    // Create category + item in tenant A
    const catResA = await app.request(
      jsonRequest('/api/t/iso-a/ordering/categories', 'POST', {
        name: 'A Food',
      }, { Authorization: `Bearer ${tokenA}` })
    );
    const catA = (await catResA.json()).data;
    await app.request(
      jsonRequest('/api/t/iso-a/ordering/items', 'POST', {
        categoryId: catA.id, name: 'A Burger', price: 10,
      }, { Authorization: `Bearer ${tokenA}` })
    );

    // Create category + item in tenant B
    const catResB = await app.request(
      jsonRequest('/api/t/iso-b/ordering/categories', 'POST', {
        name: 'B Food',
      }, { Authorization: `Bearer ${tokenB}` })
    );
    const catB = (await catResB.json()).data;
    await app.request(
      jsonRequest('/api/t/iso-b/ordering/items', 'POST', {
        categoryId: catB.id, name: 'B Sushi', price: 15,
      }, { Authorization: `Bearer ${tokenB}` })
    );

    // Customer menu for tenant A should only show A's items
    const menuRes = await app.request('/api/order/iso-a/ordering/menu');
    const menu = await menuRes.json();
    const allItemNames = menu.data.categories.flatMap(
      (cat: { items: { name: string }[] }) => cat.items.map((i) => i.name)
    );
    expect(allItemNames).toContain('A Burger');
    expect(allItemNames).not.toContain('B Sushi');
  });
});

// ---------------------------------------------------------------------------
// Order Status Management (Staff)
// ---------------------------------------------------------------------------

describe('Staff order management', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let token: string;
  let menuItemId: string;
  const SLUG = 'order-mgmt';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id);
    token = signToken(owner.id, tenant.id);

    const catRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', {
        name: 'Food',
      }, { Authorization: `Bearer ${token}` })
    );
    const catBody = await catRes.json();

    const itemRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId: catBody.data.id, name: 'Pasta', price: 14,
      }, { Authorization: `Bearer ${token}` })
    );
    const itemBody = await itemRes.json();
    menuItemId = itemBody.data.id;
  });

  it('staff can list orders', async () => {
    // Place a customer order
    await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '1',
        items: [{ menuItemId, quantity: 1 }],
      })
    );

    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders`, 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('PATCH /orders/:id/status updates order status', async () => {
    // Place order
    const orderRes = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '2',
        items: [{ menuItemId, quantity: 1 }],
      })
    );
    const { data: order } = await orderRes.json();

    // Update to confirmed
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/${order.id}/status`, 'PATCH', {
        status: 'confirmed',
      }, { Authorization: `Bearer ${token}` })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('confirmed');
  });

  it('PATCH /orders/:id/status returns 404 for non-existent order', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/fake-id/status`, 'PATCH', {
        status: 'confirmed',
      }, { Authorization: `Bearer ${token}` })
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Tenant Not Found
// ---------------------------------------------------------------------------

describe('Tenant middleware', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    db = createTestDb();
    app = createTestApp(db);
  });

  it('returns 404 for non-existent tenant slug', async () => {
    const res = await app.request('/api/t/no-such-tenant/ordering/categories');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Tenant not found');
  });

  it('returns 404 for customer routes with non-existent tenant', async () => {
    const res = await app.request('/api/order/no-such-tenant/ordering/menu');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Payment Status Routes (Staff — owner/manager only)
// ---------------------------------------------------------------------------

describe('Payment Status routes', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let ownerToken: string;
  let managerToken: string;
  let staffToken: string;
  let orderId: string;
  const SLUG = 'payment-test';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    const owner = await createTestStaff(db, tenant.id, { email: 'owner@pay.com', role: 'owner' });
    const manager = await createTestStaff(db, tenant.id, { email: 'manager@pay.com', role: 'manager' });
    const staffMember = await createTestStaff(db, tenant.id, { email: 'staff@pay.com', role: 'staff' });
    ownerToken = signToken(owner.id, tenant.id);
    managerToken = signToken(manager.id, tenant.id);
    staffToken = signToken(staffMember.id, tenant.id);

    // Seed category + item + order
    const catRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', { name: 'Food' }, {
        Authorization: `Bearer ${ownerToken}`,
      })
    );
    const { data: cat } = await catRes.json();

    const itemRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId: cat.id, name: 'Burger', price: 20,
      }, { Authorization: `Bearer ${ownerToken}` })
    );
    const { data: item } = await itemRes.json();

    const orderRes = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '7',
        items: [{ menuItemId: item.id, quantity: 1 }],
      })
    );
    const { data: order } = await orderRes.json();
    orderId = order.id;
  });

  it('PATCH /orders/:id/payment with paymentStatus=paid updates the order (owner)', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/${orderId}/payment`, 'PATCH', {
        paymentStatus: 'paid',
      }, { Authorization: `Bearer ${ownerToken}` })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.paymentStatus).toBe('paid');
  });

  it('PATCH /orders/:id/payment allows manager role to update payment status', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/${orderId}/payment`, 'PATCH', {
        paymentStatus: 'paid',
      }, { Authorization: `Bearer ${managerToken}` })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.paymentStatus).toBe('paid');
  });

  it('PATCH /orders/:id/payment returns 403 for staff role', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/${orderId}/payment`, 'PATCH', {
        paymentStatus: 'paid',
      }, { Authorization: `Bearer ${staffToken}` })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('owner or manager');
  });

  it('PATCH /orders/:id/payment returns 401 for unauthenticated request', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/${orderId}/payment`, 'PATCH', {
        paymentStatus: 'paid',
      })
    );
    expect(res.status).toBe(401);
  });

  it('PATCH /orders/:id/payment returns 400 for invalid paymentStatus value', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/${orderId}/payment`, 'PATCH', {
        paymentStatus: 'charged',
      }, { Authorization: `Bearer ${ownerToken}` })
    );
    expect(res.status).toBe(400);
  });

  it('PATCH /orders/:id/payment returns 404 for non-existent order', async () => {
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/nonexistent-order-id/payment`, 'PATCH', {
        paymentStatus: 'paid',
      }, { Authorization: `Bearer ${ownerToken}` })
    );
    expect(res.status).toBe(404);
  });

  it('PATCH /orders/:id/payment cannot update another tenant order', async () => {
    // Create a second tenant with its own order
    const tenant2 = createTestTenant(db, 'other-payment-tenant');
    const owner2 = await createTestStaff(db, tenant2.id, { email: 'owner2@pay.com', role: 'owner' });
    const token2 = signToken(owner2.id, tenant2.id);

    const catRes2 = await app.request(
      jsonRequest('/api/t/other-payment-tenant/ordering/categories', 'POST', { name: 'Food' }, {
        Authorization: `Bearer ${token2}`,
      })
    );
    const { data: cat2 } = await catRes2.json();

    const itemRes2 = await app.request(
      jsonRequest('/api/t/other-payment-tenant/ordering/items', 'POST', {
        categoryId: cat2.id, name: 'Pasta', price: 18,
      }, { Authorization: `Bearer ${token2}` })
    );
    const { data: item2 } = await itemRes2.json();

    const orderRes2 = await app.request(
      jsonRequest('/api/order/other-payment-tenant/ordering/orders', 'POST', {
        tableNumber: '1',
        items: [{ menuItemId: item2.id, quantity: 1 }],
      })
    );
    const { data: otherOrder } = await orderRes2.json();

    // Tenant 1 owner tries to update tenant 2's order via tenant 1's route
    const res = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/orders/${otherOrder.id}/payment`, 'PATCH', {
        paymentStatus: 'paid',
      }, { Authorization: `Bearer ${ownerToken}` })
    );
    expect(res.status).toBe(404);
  });

  it('PATCH /orders/:id/payment supports all valid payment statuses', async () => {
    for (const status of ['paid', 'refunded', 'unpaid'] as const) {
      const res = await app.request(
        jsonRequest(`/api/t/${SLUG}/ordering/orders/${orderId}/payment`, 'PATCH', {
          paymentStatus: status,
        }, { Authorization: `Bearer ${ownerToken}` })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.paymentStatus).toBe(status);
    }
  });
});

// ---------------------------------------------------------------------------
// Tax — Route Integration
// ---------------------------------------------------------------------------

describe('Tax — route integration', () => {
  let db: TestDB;
  let app: ReturnType<typeof createTestApp>;
  let ownerToken: string;
  let menuItemId: string;
  let tenantId: string;
  const SLUG = 'tax-route-test';

  beforeEach(async () => {
    db = createTestDb();
    app = createTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    tenantId = tenant.id;
    const owner = await createTestStaff(db, tenant.id);
    ownerToken = signToken(owner.id, tenant.id);

    // Seed a category + item via staff routes
    const catRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/categories`, 'POST', { name: 'Food' }, {
        Authorization: `Bearer ${ownerToken}`,
      })
    );
    const { data: cat } = await catRes.json();

    const itemRes = await app.request(
      jsonRequest(`/api/t/${SLUG}/ordering/items`, 'POST', {
        categoryId: cat.id, name: 'Burger', price: 20,
      }, { Authorization: `Bearer ${ownerToken}` })
    );
    const { data: item } = await itemRes.json();
    menuItemId = item.id;
  });

  function setTaxSettings(taxRate: number, taxInclusive: boolean) {
    db.update(schema.tenants)
      .set({ settings: JSON.stringify({ taxRate, taxInclusive }) })
      .where(eq(schema.tenants.id, tenantId))
      .run();
  }

  it('POST /orders on tenant with taxRate:10 returns correct taxAmount and total', async () => {
    setTaxSettings(10, false);

    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '3',
        items: [{ menuItemId, quantity: 1 }],
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    // item price = 20.00, exclusive 10% tax
    // taxAmount = 20.00 * 0.10 = 2.00
    // total = 20.00 + 2.00 = 22.00
    expect(body.data.taxAmount).toBe(2.0);
    expect(body.data.total).toBe(22.0);
  });

  it('POST /orders on tenant with no taxRate returns taxAmount:0', async () => {
    // settings left as default '{}'
    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '4',
        items: [{ menuItemId, quantity: 1 }],
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.taxAmount).toBe(0);
    expect(body.data.total).toBe(20.0);
  });

  it('POST /orders on tenant with inclusive taxRate:10 leaves total unchanged', async () => {
    setTaxSettings(10, true);

    const res = await app.request(
      jsonRequest(`/api/order/${SLUG}/ordering/orders`, 'POST', {
        tableNumber: '5',
        items: [{ menuItemId, quantity: 1 }],
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    // item price = 20.00 (tax already included)
    // taxAmount = 20.00 - (20.00 / 1.10) = 20.00 - 18.18... ≈ 1.82
    // total stays 20.00
    expect(body.data.taxAmount).toBe(1.82);
    expect(body.data.total).toBe(20.0);
  });
});
