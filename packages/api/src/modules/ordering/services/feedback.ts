import { eq, and, gte, desc, count, sql } from 'drizzle-orm';
import { feedback, orders } from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';

// --- Feedback Service ---

/**
 * Submit customer feedback for an order.
 */
export function submitFeedback(
  db: DrizzleDB,
  tenantId: string,
  orderId: string,
  tableNumber: string,
  rating: number,
  comment?: string,
) {
  // Validate order exists and belongs to tenant
  const order = db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.tenantId, tenantId)
      )
    )
    .get();

  if (!order) {
    return { error: 'Order not found' as const };
  }

  const created = db
    .insert(feedback)
    .values({
      tenantId,
      orderId,
      tableNumber,
      rating,
      comment: comment ?? null,
    })
    .returning()
    .get();

  return { data: created };
}

/**
 * Get paginated feedback list for a tenant (staff view).
 */
export function getFeedback(
  db: DrizzleDB,
  tenantId: string,
  page?: number,
  limit?: number,
) {
  const pageSize = limit ?? 20;
  const pageNum = page ?? 1;
  const offset = (pageNum - 1) * pageSize;

  const totalResult = db
    .select({ total: count() })
    .from(feedback)
    .where(eq(feedback.tenantId, tenantId))
    .get();
  const total = totalResult?.total ?? 0;

  const data = db
    .select()
    .from(feedback)
    .where(eq(feedback.tenantId, tenantId))
    .orderBy(desc(feedback.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  return { data, total, page: pageNum, limit: pageSize };
}

/**
 * Get aggregated feedback summary for a tenant.
 */
export function getFeedbackSummary(
  db: DrizzleDB,
  tenantId: string,
  days?: number,
) {
  const conditions = [eq(feedback.tenantId, tenantId)];

  if (days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    conditions.push(gte(feedback.createdAt, since));
  }

  const whereClause = and(...conditions);

  // Get average rating and total count
  const stats = db
    .select({
      avgRating: sql<number>`AVG(${feedback.rating})`,
      totalCount: count(),
    })
    .from(feedback)
    .where(whereClause)
    .get();

  // Get breakdown by rating
  const breakdownRows = db
    .select({
      rating: feedback.rating,
      count: count(),
    })
    .from(feedback)
    .where(whereClause)
    .groupBy(feedback.rating)
    .all();

  const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of breakdownRows) {
    ratingBreakdown[row.rating] = row.count;
  }

  return {
    avgRating: stats?.avgRating ? Math.round(stats.avgRating * 100) / 100 : 0,
    totalCount: stats?.totalCount ?? 0,
    ratingBreakdown,
  };
}
