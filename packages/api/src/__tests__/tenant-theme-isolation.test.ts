/**
 * Tenant-theme isolation — S-TENANT-ISOLATION-TEST
 *
 * Verifies that tenant A's `settings.theme` value is NOT visible when an
 * authenticated user of tenant B reads /api/t/B/settings.
 *
 * The settings are stored as a JSON blob on the tenants row.  The isolation
 * property is that the tenant middleware resolves the tenant from the URL slug,
 * so a request to /api/t/tenant-b/settings reads B's row, not A's.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as schema from '../db/schema';
import { tenantSettingsRoutes } from '../routes/tenant-settings';
import { tenantMiddleware } from '../middleware/tenant';
import type { TenantEnv } from '../lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ---------------------------------------------------------------------------
// Test DB — only the tables the settings route chain needs
// ---------------------------------------------------------------------------

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
  `);

  return drizzle(sqlite, { schema });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTenant(db: TestDB, slug: string, settingsObj?: Record<string, unknown>) {
  return db
    .insert(schema.tenants)
    .values({
      name: `Tenant ${slug}`,
      slug,
      settings: settingsObj ? JSON.stringify(settingsObj) : '{}',
    })
    .returning()
    .get();
}

async function createStaff(db: TestDB, tenantId: string, email: string) {
  const passwordHash = await bcrypt.hash('password123', 4);
  return db
    .insert(schema.staff)
    .values({
      tenantId,
      email,
      passwordHash,
      name: 'Test Owner',
      role: 'owner',
    })
    .returning()
    .get();
}

function signToken(staffId: string, tenantId: string) {
  return jwt.sign({ staffId, tenantId }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp(db: TestDB) {
  const app = new Hono();
  const tenantApp = new Hono<TenantEnv>();
  tenantApp.use('*', tenantMiddleware(db));
  tenantApp.route('/settings', tenantSettingsRoutes(db));
  app.route('/api/t/:tenantSlug', tenantApp);
  return app;
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('Tenant theme isolation (S-TENANT-ISOLATION-TEST)', () => {
  let db: TestDB;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db);
  });

  it('tenant B GET /settings does not expose tenant A\'s theme value', async () => {
    // Seed tenant A with theme = 'sichuan'
    const tenantA = createTenant(db, 'tenant-a', { theme: 'sichuan' });

    // Seed tenant B with no settings
    const tenantB = createTenant(db, 'tenant-b');

    // Create a staff member for tenant B
    const staffB = await createStaff(db, tenantB.id, 'owner@tenant-b.com');
    const tokenB = signToken(staffB.id, tenantB.id);

    // Make request as tenant B staff to /api/t/tenant-b/settings
    const res = await app.request(
      new Request('http://localhost/api/t/tenant-b/settings', {
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { data: Record<string, unknown> };

    // B's settings should NOT contain tenant A's theme
    expect(body.data.theme).toBeUndefined();

    // Sanity check: tenant A still has the sichuan theme in the DB
    const storedA = db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantA.id)).get();
    expect(storedA).toBeDefined();
    const settingsA = JSON.parse(storedA!.settings ?? '{}') as Record<string, unknown>;
    expect(settingsA.theme).toBe('sichuan');
  });
});
