import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { tableStatuses, waiterCalls, TABLE_STATUSES } from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';
import type { TableStatus } from '../../../db/schema.js';

// --- Table Status Service ---

export function getTableStatuses(db: DrizzleDB, tenantId: string) {
  return db
    .select()
    .from(tableStatuses)
    .where(eq(tableStatuses.tenantId, tenantId))
    .orderBy(tableStatuses.tableNumber)
    .all();
}

export function upsertTableStatus(
  db: DrizzleDB,
  tenantId: string,
  tableNumber: string,
  status: TableStatus,
) {
  // Try update first; if no row exists, insert.
  const existing = db
    .select()
    .from(tableStatuses)
    .where(
      and(
        eq(tableStatuses.tenantId, tenantId),
        eq(tableStatuses.tableNumber, tableNumber),
      ),
    )
    .get();

  const now = new Date().toISOString();

  if (existing) {
    return db
      .update(tableStatuses)
      .set({ status, updatedAt: now })
      .where(
        and(
          eq(tableStatuses.tenantId, tenantId),
          eq(tableStatuses.tableNumber, tableNumber),
        ),
      )
      .returning()
      .get();
  }

  return db
    .insert(tableStatuses)
    .values({
      id: nanoid(),
      tenantId,
      tableNumber,
      status,
      updatedAt: now,
    })
    .returning()
    .get();
}

// --- Waiter Call Service ---

export function createWaiterCall(
  db: DrizzleDB,
  tenantId: string,
  tableNumber: string,
) {
  return db
    .insert(waiterCalls)
    .values({
      id: nanoid(),
      tenantId,
      tableNumber,
      acknowledged: false,
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

export function getUnacknowledgedWaiterCalls(db: DrizzleDB, tenantId: string) {
  return db
    .select()
    .from(waiterCalls)
    .where(
      and(
        eq(waiterCalls.tenantId, tenantId),
        eq(waiterCalls.acknowledged, false),
      ),
    )
    .orderBy(waiterCalls.createdAt)
    .all();
}

export function acknowledgeWaiterCall(
  db: DrizzleDB,
  tenantId: string,
  callId: string,
) {
  return db
    .update(waiterCalls)
    .set({ acknowledged: true })
    .where(
      and(
        eq(waiterCalls.id, callId),
        eq(waiterCalls.tenantId, tenantId),
      ),
    )
    .returning()
    .get();
}

export { TABLE_STATUSES };
