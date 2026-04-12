import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../../db/schema';
import {
  getTableStatuses,
  upsertTableStatus,
  createWaiterCall,
  getUnacknowledgedWaiterCalls,
  acknowledgeWaiterCall,
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

    CREATE TABLE table_statuses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      table_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'free',
      updated_at TEXT NOT NULL,
      UNIQUE(tenant_id, table_number)
    );

    CREATE TABLE waiter_calls (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      table_number TEXT NOT NULL,
      call_type TEXT NOT NULL DEFAULT 'assistance',
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX idx_waiter_calls_tenant_ack ON waiter_calls(tenant_id, acknowledged);
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
// Table Status
// ---------------------------------------------------------------------------

describe('Table Status', () => {
  let db: TestDB;
  let tenantId: string;
  let otherTenantId: string;

  beforeEach(() => {
    db = createTestDb();
    tenantId = createTestTenant(db, 'tenant-a').id;
    otherTenantId = createTestTenant(db, 'tenant-b').id;
  });

  it('upserts a new table status (insert path)', () => {
    const row = upsertTableStatus(db, tenantId, '5', 'occupied');
    expect(row).toBeDefined();
    expect(row!.tenantId).toBe(tenantId);
    expect(row!.tableNumber).toBe('5');
    expect(row!.status).toBe('occupied');
    expect(row!.updatedAt).toEqual(expect.any(String));
  });

  it('updates an existing table status (update path)', () => {
    upsertTableStatus(db, tenantId, '5', 'free');
    const updated = upsertTableStatus(db, tenantId, '5', 'needs_cleaning');
    expect(updated!.status).toBe('needs_cleaning');

    // Only one row should exist for this table
    const all = getTableStatuses(db, tenantId);
    expect(all.filter((t) => t.tableNumber === '5')).toHaveLength(1);
  });

  it('lists all table statuses for a tenant', () => {
    upsertTableStatus(db, tenantId, '1', 'free');
    upsertTableStatus(db, tenantId, '2', 'occupied');
    upsertTableStatus(db, tenantId, '3', 'needs_cleaning');

    const rows = getTableStatuses(db, tenantId);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.tableNumber)).toEqual(
      expect.arrayContaining(['1', '2', '3']),
    );
  });

  it('tenant isolation — does not expose another tenant tables', () => {
    upsertTableStatus(db, tenantId, '1', 'occupied');
    upsertTableStatus(db, otherTenantId, '99', 'free');

    const rows = getTableStatuses(db, tenantId);
    expect(rows).toHaveLength(1);
    expect(rows[0].tableNumber).toBe('1');

    const otherRows = getTableStatuses(db, otherTenantId);
    expect(otherRows).toHaveLength(1);
    expect(otherRows[0].tableNumber).toBe('99');
  });
});

// ---------------------------------------------------------------------------
// Waiter Calls
// ---------------------------------------------------------------------------

describe('Waiter Calls', () => {
  let db: TestDB;
  let tenantId: string;
  let otherTenantId: string;

  beforeEach(() => {
    db = createTestDb();
    tenantId = createTestTenant(db, 'tenant-a').id;
    otherTenantId = createTestTenant(db, 'tenant-b').id;
  });

  it('creates a waiter call with correct fields', () => {
    const call = createWaiterCall(db, tenantId, '3');
    expect(call).toBeDefined();
    expect(call.tenantId).toBe(tenantId);
    expect(call.tableNumber).toBe('3');
    expect(call.acknowledged).toBe(false);
    expect(call.createdAt).toEqual(expect.any(String));
  });

  it('lists only unacknowledged calls', () => {
    const c1 = createWaiterCall(db, tenantId, '1');
    createWaiterCall(db, tenantId, '2');
    acknowledgeWaiterCall(db, tenantId, c1.id);

    const pending = getUnacknowledgedWaiterCalls(db, tenantId);
    expect(pending).toHaveLength(1);
    expect(pending[0].tableNumber).toBe('2');
  });

  it('acknowledges a waiter call', () => {
    const call = createWaiterCall(db, tenantId, '7');
    const acked = acknowledgeWaiterCall(db, tenantId, call.id);
    expect(acked).toBeDefined();
    expect(acked!.acknowledged).toBe(true);

    const pending = getUnacknowledgedWaiterCalls(db, tenantId);
    expect(pending).toHaveLength(0);
  });

  it('acknowledgeWaiterCall returns undefined for wrong tenant', () => {
    const call = createWaiterCall(db, tenantId, '5');
    const result = acknowledgeWaiterCall(db, otherTenantId, call.id);
    // Should not find the row (different tenant)
    expect(result).toBeUndefined();
    // Original call should still be unacknowledged
    const pending = getUnacknowledgedWaiterCalls(db, tenantId);
    expect(pending).toHaveLength(1);
  });

  it('tenant isolation — unacknowledged calls are scoped to tenant', () => {
    createWaiterCall(db, tenantId, '1');
    createWaiterCall(db, tenantId, '2');
    createWaiterCall(db, otherTenantId, '99');

    const tenantCalls = getUnacknowledgedWaiterCalls(db, tenantId);
    expect(tenantCalls).toHaveLength(2);
    expect(tenantCalls.every((c) => c.tenantId === tenantId)).toBe(true);

    const otherCalls = getUnacknowledgedWaiterCalls(db, otherTenantId);
    expect(otherCalls).toHaveLength(1);
    expect(otherCalls[0].tableNumber).toBe('99');
  });
});
