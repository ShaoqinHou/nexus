import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';

// --- Analytics Response Types ---

interface DailyRevenue {
  date: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
}

interface TopItem {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface PeakHour {
  hour: number;
  orderCount: number;
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

interface PromoStat {
  promoName: string;
  timesUsed: number;
  totalDiscount: number;
}

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

export type { DailyRevenue, TopItem, PeakHour, PeriodStats, OrderStats, PromoStat, DailySummary };

// --- Hooks ---

const ANALYTICS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useDailyRevenue(tenantSlug: string, days: number = 30) {
  return useQuery({
    queryKey: [...orderingKeys.all, 'analytics', 'revenue', days] as const,
    queryFn: () =>
      apiClient.get<{ data: DailyRevenue[] }>(
        `/t/${tenantSlug}/ordering/analytics/revenue?days=${days}`,
      ),
    select: (res) => res.data,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useTopItems(tenantSlug: string, limit: number = 10) {
  return useQuery({
    queryKey: [...orderingKeys.all, 'analytics', 'top-items', limit] as const,
    queryFn: () =>
      apiClient.get<{ data: TopItem[] }>(
        `/t/${tenantSlug}/ordering/analytics/top-items?limit=${limit}`,
      ),
    select: (res) => res.data,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function usePeakHours(tenantSlug: string, days: number = 7) {
  return useQuery({
    queryKey: [...orderingKeys.all, 'analytics', 'peak-hours', days] as const,
    queryFn: () =>
      apiClient.get<{ data: PeakHour[] }>(
        `/t/${tenantSlug}/ordering/analytics/peak-hours?days=${days}`,
      ),
    select: (res) => res.data,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useOrderStats(tenantSlug: string) {
  return useQuery({
    queryKey: [...orderingKeys.all, 'analytics', 'stats'] as const,
    queryFn: () =>
      apiClient.get<{ data: OrderStats }>(
        `/t/${tenantSlug}/ordering/analytics/stats`,
      ),
    select: (res) => res.data,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function usePromoStats(tenantSlug: string) {
  return useQuery({
    queryKey: [...orderingKeys.all, 'analytics', 'promos'] as const,
    queryFn: () =>
      apiClient.get<{ data: PromoStat[] }>(
        `/t/${tenantSlug}/ordering/analytics/promos`,
      ),
    select: (res) => res.data,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useStatusBreakdown(tenantSlug: string) {
  return useQuery({
    queryKey: [...orderingKeys.all, 'analytics', 'status-breakdown'] as const,
    queryFn: () =>
      apiClient.get<{ data: Record<string, number> }>(
        `/t/${tenantSlug}/ordering/analytics/status-breakdown`,
      ),
    select: (res) => res.data,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useDailySummary(tenantSlug: string, date: string) {
  return useQuery({
    queryKey: [...orderingKeys.all, 'analytics', 'daily-summary', date] as const,
    queryFn: () =>
      apiClient.get<{ data: DailySummary }>(
        `/t/${tenantSlug}/ordering/analytics/daily-summary?date=${date}`,
      ),
    select: (res) => res.data,
    staleTime: ANALYTICS_STALE_TIME,
    enabled: !!date,
  });
}
