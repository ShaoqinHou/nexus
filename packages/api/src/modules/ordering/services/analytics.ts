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

// --- Daily Summary (EOD Report) ---

interface DailySummaryTopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface DailySummary {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscounts: number;
  cancelledOrders: number;
  cancelledAmount: number;
  avgOrderValue: number;
  topItems: DailySummaryTopItem[];
  paymentBreakdown: {
    paid: { count: number; amount: number };
    unpaid: { count: number; amount: number };
    refunded: { count: number; amount: number };
  };
}

export function getDailySummary(
  db: DrizzleDB,
  tenantId: string,
  date: string,
): DailySummary {
  // Get all orders for the given date
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const dayOrders = db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, dayStart),
        sql`${orders.createdAt} <= ${dayEnd}`,
      ),
    )
    .all();

  const totalOrders = dayOrders.length;
  const cancelledOrders = dayOrders.filter((o) => o.status === 'cancelled');
  const nonCancelledOrders = dayOrders.filter((o) => o.status !== 'cancelled');

  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.total, 0);
  const totalDiscounts = nonCancelledOrders.reduce((sum, o) => sum + (o.discountAmount ?? 0), 0);
  const cancelledAmount = cancelledOrders.reduce((sum, o) => sum + o.total, 0);

  // GST 15% calculation (tax = total * 3/23 for GST-inclusive pricing)
  const totalTax = Math.round((totalRevenue * 3 / 23) * 100) / 100;

  const avgOrderValue = nonCancelledOrders.length > 0
    ? Math.round((totalRevenue / nonCancelledOrders.length) * 100) / 100
    : 0;

  // Payment breakdown
  const paymentBreakdown = {
    paid: { count: 0, amount: 0 },
    unpaid: { count: 0, amount: 0 },
    refunded: { count: 0, amount: 0 },
  };

  for (const order of nonCancelledOrders) {
    const ps = (order.paymentStatus ?? 'unpaid') as 'paid' | 'unpaid' | 'refunded';
    paymentBreakdown[ps].count += 1;
    paymentBreakdown[ps].amount += order.total;
  }

  // Round amounts
  paymentBreakdown.paid.amount = Math.round(paymentBreakdown.paid.amount * 100) / 100;
  paymentBreakdown.unpaid.amount = Math.round(paymentBreakdown.unpaid.amount * 100) / 100;
  paymentBreakdown.refunded.amount = Math.round(paymentBreakdown.refunded.amount * 100) / 100;

  // Top 5 items for the day
  const topItemRows = db
    .select({
      name: orderItems.name,
      quantity: sql<number>`SUM(${orderItems.quantity})`.as('total_qty'),
      revenue: sql<number>`SUM(${orderItems.price} * ${orderItems.quantity})`.as('total_revenue'),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, dayStart),
        sql`${orders.createdAt} <= ${dayEnd}`,
        sql`${orders.status} != 'cancelled'`,
      ),
    )
    .groupBy(orderItems.name)
    .orderBy(desc(sql`total_revenue`))
    .limit(5)
    .all();

  const topItems: DailySummaryTopItem[] = topItemRows.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    revenue: Math.round(row.revenue * 100) / 100,
  }));

  return {
    date,
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalTax,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    cancelledOrders: cancelledOrders.length,
    cancelledAmount: Math.round(cancelledAmount * 100) / 100,
    avgOrderValue,
    topItems,
    paymentBreakdown,
  };
}
