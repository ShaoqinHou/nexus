import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import jwt from 'jsonwebtoken';
import * as schema from '../../db/schema';
import { tenantMiddleware } from '../tenant';
import { authMiddleware } from '../auth';
import type { AuthEnv } from '../../lib/types';

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
  `);
  return drizzle(sqlite, { schema });
}

function createTestTenant(db: TestDB, slug: string) {
  return db
    .insert(schema.tenants)
    .values({ name: `Tenant ${slug}`, slug })
    .returning()
    .get();
}

function createTestStaff(
  db: TestDB,
  tenantId: string,
  overrides: { email?: string; name?: string; role?: string; isActive?: number } = {}
) {
  return db
    .insert(schema.staff)
    .values({
      tenantId,
      email: overrides.email ?? 'owner@test.com',
      passwordHash: '$2b$04$placeholder-hash-not-used-in-auth-middleware',
      name: overrides.name ?? 'Test Owner',
      role: overrides.role ?? 'owner',
      isActive: overrides.isActive ?? 1,
    })
    .returning()
    .get();
}

function signToken(
  staffId: string,
  tenantId: string,
  options?: jwt.SignOptions,
  secret = JWT_SECRET
) {
  return jwt.sign({ staffId, tenantId }, secret, { expiresIn: '1h', ...options });
}

/**
 * Creates a minimal app that:
 *  - mounts tenant middleware on /api/t/:tenantSlug
 *  - mounts auth middleware on the same scope
 *  - responds 200 with { ok: true, role: user.role } on GET /probe when auth passes
 */
function createAuthTestApp(db: TestDB) {
  const app = new Hono();
  const tenantApp = new Hono<AuthEnv>();
  tenantApp.use('*', tenantMiddleware(db));
  tenantApp.use('*', authMiddleware(db));
  tenantApp.get('/probe', (c) => c.json({ ok: true, role: c.var.user.role }));
  app.route('/api/t/:tenantSlug', tenantApp);
  return app;
}

function authRequest(tenantSlug: string, authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers['Authorization'] = authHeader;
  }
  return new Request(`http://localhost/api/t/${tenantSlug}/probe`, { headers });
}

// ---------------------------------------------------------------------------
// Auth Middleware — direct unit-style tests via route harness
// ---------------------------------------------------------------------------

describe('Auth middleware', () => {
  let db: TestDB;
  let app: ReturnType<typeof createAuthTestApp>;
  let tenantId: string;
  let staffId: string;
  const SLUG = 'auth-mid-test';

  beforeEach(() => {
    db = createTestDb();
    app = createAuthTestApp(db);
    const tenant = createTestTenant(db, SLUG);
    tenantId = tenant.id;
    const staffMember = createTestStaff(db, tenantId);
    staffId = staffMember.id;
  });

  // --- Missing / malformed header ---

  it('returns 401 when Authorization header is absent', async () => {
    const res = await app.request(authRequest(SLUG));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/authorization header required/i);
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await app.request(authRequest(SLUG, 'Token somevalue'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/authorization header required/i);
  });

  it('returns 401 for a completely non-JWT token string', async () => {
    const res = await app.request(authRequest(SLUG, 'Bearer not-a-jwt'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or expired token/i);
  });

  it('returns 401 for a JWT signed with the wrong secret', async () => {
    const badToken = signToken(staffId, tenantId, {}, 'wrong-secret');
    const res = await app.request(authRequest(SLUG, `Bearer ${badToken}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or expired token/i);
  });

  it('returns 401 for an expired JWT', async () => {
    const expiredToken = signToken(staffId, tenantId, { expiresIn: -1 });
    const res = await app.request(authRequest(SLUG, `Bearer ${expiredToken}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or expired token/i);
  });

  it('returns 401 for a JWT missing the staffId claim', async () => {
    const badPayloadToken = jwt.sign({ tenantId }, JWT_SECRET, { expiresIn: '1h' });
    const res = await app.request(authRequest(SLUG, `Bearer ${badPayloadToken}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid token payload/i);
  });

  it('returns 401 for a JWT missing the tenantId claim', async () => {
    const badPayloadToken = jwt.sign({ staffId }, JWT_SECRET, { expiresIn: '1h' });
    const res = await app.request(authRequest(SLUG, `Bearer ${badPayloadToken}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid token payload/i);
  });

  // --- Tenant mismatch ---

  it('returns 401 when token tenantId does not match the URL tenant', async () => {
    const otherTenant = createTestTenant(db, 'other-auth-tenant');
    const otherStaff = createTestStaff(db, otherTenant.id, { email: 'other@other.com' });
    // Token scoped to otherTenant, but URL is for SLUG (tenantId)
    const mismatchToken = signToken(otherStaff.id, otherTenant.id);
    const res = await app.request(authRequest(SLUG, `Bearer ${mismatchToken}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/does not match tenant/i);
  });

  // --- Non-existent / inactive staff ---

  it('returns 401 when staffId in token does not exist in the DB', async () => {
    const ghostToken = signToken('nonexistent-staff-id', tenantId);
    const res = await app.request(authRequest(SLUG, `Bearer ${ghostToken}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/not found or inactive/i);
  });

  it('returns 401 for a deactivated staff member', async () => {
    const inactiveStaff = createTestStaff(db, tenantId, {
      email: 'inactive@test.com',
      isActive: 0,
    });
    const inactiveToken = signToken(inactiveStaff.id, tenantId);
    const res = await app.request(authRequest(SLUG, `Bearer ${inactiveToken}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/not found or inactive/i);
  });

  // --- Happy path ---

  it('sets c.var.user and calls next when token is valid', async () => {
    const validToken = signToken(staffId, tenantId);
    const res = await app.request(authRequest(SLUG, `Bearer ${validToken}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.role).toBe('owner');
  });
});
