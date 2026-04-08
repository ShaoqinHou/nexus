import { eq, and, gte, sql, desc } from 'drizzle-orm';
import {
  orders,
  orderItems,
  promoCodes,
  promotions,
} from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';
import type { OrderStatus } from '../../../db/schema.js';

// --- Analytics Service ---

interface DailyRevenue {
  date: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
}

export function getDailyRevenue(
  db: DrizzleDB,
  tenantId: string,
  days: number = 30,
): DailyRevenue[] {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const rows = db
    .select({
      date: sql<string>`DATE(${orders.createdAt})`.as('date'),
      revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`.as('revenue'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(sql`DATE(${orders.createdAt})`, since),
      ),
    )
    .groupBy(sql`DATE(${orders.createdAt})`)
    .orderBy(sql`DATE(${orders.createdAt})`)
    .all();

  return rows.map((row) => ({
    date: row.date,
    revenue: Math.round(row.revenue * 100) / 100,
    orderCount: row.orderCount,
    avgOrderValue:
      row.orderCount > 0
        ? Math.round((row.revenue / row.orderCount) * 100) / 100
        : 0,
  }));
}

interface TopItem {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function getTopItems(
  db: DrizzleDB,
  tenantId: string,
  limit: number = 10,
): TopItem[] {
  const rows = db
    .select({
      menuItemId: orderItems.menuItemId,
      name: orderItems.name,
      quantity: sql<number>`SUM(${orderItems.quantity})`.as('total_qty'),
      revenue: sql<number>`SUM(${orderItems.price} * ${orderItems.quantity})`.as('total_revenue'),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.tenantId, tenantId))
    .groupBy(orderItems.menuItemId, orderItems.name)
    .orderBy(desc(sql`total_revenue`))
    .limit(limit)
    .all();

  return rows.map((row) => ({
    menuItemId: row.menuItemId,
    name: row.name,
    quantity: row.quantity,
    revenue: Math.round(row.revenue * 100) / 100,
  }));
}

interface PeakHour {
  hour: number;
  orderCount: number;
}

export function getPeakHours(
  db: DrizzleDB,
  tenantId: string,
  days: number = 7,
): PeakHour[] {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = db
    .select({
      hour: sql<number>`CAST(strftime('%H', ${orders.createdAt}) AS INTEGER)`.as('hour'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, since),
      ),
    )
    .groupBy(sql`CAST(strftime('%H', ${orders.createdAt}) AS INTEGER)`)
    .orderBy(sql`hour`)
    .all();

  // Fill all 24 hours (missing hours = 0)
  const hourMap = new Map(rows.map((r) => [r.hour, r.orderCount]));
  const result: PeakHour[] = [];
  for (let h = 0; h < 24; h++) {
    result.push({ hour: h, orderCount: hourMap.get(h) ?? 0 });
  }
  return result;
}

interface PeriodStats {
  revenue: number;
  count: number;
}

interface OrderStats {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  allTime: PeriodStats;
}

export function getOrderStats(db: DrizzleDB, tenantId: string): OrderStats {
  const nowMs = Date.now();
  const todayStart = new Date(nowMs).toISOString().split('T')[0] + 'T00:00:00.000Z';
  const weekStart = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();

  function queryPeriod(since?: string): PeriodStats {
    const conditions = [eq(orders.tenantId, tenantId)];
    if (since) {
      conditions.push(gte(orders.createdAt, since));
    }

    const row = db
      .select({
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`.as('revenue'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(orders)
      .where(and(...conditions))
      .get();

    return {
      revenue: Math.round((row?.revenue ?? 0) * 100) / 100,
      count: row?.count ?? 0,
    };
  }

  return {
    today: queryPeriod(todayStart),
    week: queryPeriod(weekStart),
    month: queryPeriod(monthStart),
    allTime: queryPeriod(),
  };
}

interface PromoStat {
  promoName: string;
  timesUsed: number;
  totalDiscount: number;
}

export function getPromoStats(
  db: DrizzleDB,
  tenantId: string,
): PromoStat[] {
  // Join orders with promo codes and promotions to get discount stats
  const rows = db
    .select({
      promoName: promotions.name,
      timesUsed: sql<number>`COUNT(*)`.as('times_used'),
      totalDiscount: sql<number>`COALESCE(SUM(${orders.discountAmount}), 0)`.as('total_discount'),
    })
    .from(orders)
    .innerJoin(promoCodes, eq(orders.promoCodeId, promoCodes.id))
    .innerJoin(promotions, eq(promoCodes.promotionId, promotions.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        sql`${orders.promoCodeId} IS NOT NULL`,
      ),
    )
    .groupBy(promotions.id, promotions.name)
    .orderBy(desc(sql`total_discount`))
    .all();

  return rows.map((row) => ({
    promoName: row.promoName,
    timesUsed: row.timesUsed,
    totalDiscount: Math.round(row.totalDiscount * 100) / 100,
  }));
}

export function getStatusBreakdown(
  db: DrizzleDB,
  tenantId: string,
): Record<string, number> {
  const rows = db
    .select({
      status: orders.status,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(orders)
    .where(eq(orders.tenantId, tenantId))
    .groupBy(orders.status)
    .all();

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = row.count;
  }
  return result;
}
