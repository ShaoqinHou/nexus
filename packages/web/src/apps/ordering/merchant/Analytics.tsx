import { useMemo, useState } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, BarChart3, PackageOpen, Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@web/components/ui';
import { EmptyState } from '@web/components/patterns';
import { formatPrice } from '@web/lib/format';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import {
  useDailyRevenue,
  useTopItems,
  usePeakHours,
  useOrderStats,
  usePromoStats,
} from '../hooks/useAnalytics';
import type { DailyRevenue, PeakHour } from '../hooks/useAnalytics';

// ---------------------------------------------------------------------------
// Simple SVG Bar Chart
// ---------------------------------------------------------------------------

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  barColor?: string;
}

function BarChart({ data, height = 200, barColor = 'var(--color-primary)' }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(Math.floor(100 / data.length), 1);
  const gap = Math.max(barWidth * 0.1, 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        height={height + 30}
        viewBox={`0 0 ${data.length * barWidth} ${height + 30}`}
        preserveAspectRatio="none"
        className="min-w-[300px]"
      >
        {data.map((d, i) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * height : 0;
          return (
            <g key={i}>
              <rect
                x={i * barWidth + gap / 2}
                y={height - barHeight}
                width={Math.max(barWidth - gap, 1)}
                height={barHeight}
                fill={barColor}
                rx="2"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
              {/* Label (show every Nth to avoid clutter) */}
              {(data.length <= 12 || i % Math.ceil(data.length / 12) === 0) && (
                <text
                  x={i * barWidth + barWidth / 2}
                  y={height + 16}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--color-text-secondary)"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div className="flex-shrink-0 rounded-lg bg-primary-light p-3 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="mt-1 text-2xl font-bold text-text">{value}</p>
          <p className="text-xs text-text-tertiary">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Revenue Chart
// ---------------------------------------------------------------------------

function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: d.date.slice(5), // MM-DD
        value: d.revenue,
      })),
    [data],
  );

  if (data.length === 0) {
    return (
      <EmptyState icon={BarChart3} title="No revenue data" description="Orders will appear here once placed." />
    );
  }

  return <BarChart data={chartData} height={180} />;
}

// ---------------------------------------------------------------------------
// Peak Hours Chart
// ---------------------------------------------------------------------------

function PeakHoursChart({ data }: { data: PeakHour[] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: `${d.hour}`,
        value: d.orderCount,
      })),
    [data],
  );

  return <BarChart data={chartData} height={180} barColor="var(--color-success)" />;
}

// ---------------------------------------------------------------------------
// Analytics Page
// ---------------------------------------------------------------------------

const DATE_RANGE_PRESETS = [7, 30, 90, 365] as const;

function DateRangeLabel(days: number): string {
  if (days === 365) return 'All';
  return `${days}d`;
}

export function Analytics() {
  const { tenantSlug } = useTenant();
  const [days, setDays] = useState(30);

  const { data: stats, isLoading: statsLoading } = useOrderStats(tenantSlug);
  const { data: revenue, isLoading: revenueLoading } = useDailyRevenue(tenantSlug, days);
  const { data: peakHours, isLoading: peakLoading } = usePeakHours(tenantSlug, days);
  const { data: topItems, isLoading: topLoading } = useTopItems(tenantSlug, 10);
  const { data: promoStats, isLoading: promoLoading } = usePromoStats(tenantSlug);

  const avgOrderValue = useMemo(() => {
    if (!stats || stats.allTime.count === 0) return 0;
    return stats.allTime.revenue / stats.allTime.count;
  }, [stats]);

  const isLoading = statsLoading || revenueLoading || peakLoading || topLoading || promoLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Analytics</h1>
        <div className="flex gap-2">
          {DATE_RANGE_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={[
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                days === d
                  ? 'bg-primary text-text-inverse'
                  : 'bg-bg-muted text-text-secondary hover:bg-bg-surface',
              ].join(' ')}
            >
              {DateRangeLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatPrice(stats?.today.revenue ?? 0)}
          subtitle={`${stats?.today.count ?? 0} orders`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="This Week"
          value={formatPrice(stats?.week.revenue ?? 0)}
          subtitle={`${stats?.week.count ?? 0} orders`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="This Month"
          value={formatPrice(stats?.month.revenue ?? 0)}
          subtitle={`${stats?.month.count ?? 0} orders`}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Order Value"
          value={formatPrice(avgOrderValue)}
          subtitle={`${stats?.allTime.count ?? 0} total orders`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue ({days === 365 ? 'All Time' : `Last ${days} Days`})</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours ({days === 365 ? 'All Time' : `Last ${days} Days`})</CardTitle>
          </CardHeader>
          <CardContent>
            <PeakHoursChart data={peakHours ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topItems && topItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary">Item</th>
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary text-right">
                        Qty Sold
                      </th>
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary text-right">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item, idx) => (
                      <tr
                        key={item.menuItemId}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 sm:px-6 py-3 text-text">
                          <span className="text-text-tertiary mr-2">{idx + 1}.</span>
                          {item.name}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-text text-right tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-text text-right tabular-nums">
                          {formatPrice(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-8">
                <EmptyState icon={PackageOpen} title="No items sold yet" description="Sales data will appear here." />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promotion Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Promotion Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {promoStats && promoStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary">
                        Promotion
                      </th>
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary text-right">
                        Uses
                      </th>
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary text-right">
                        Discount Given
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoStats.map((promo) => (
                      <tr
                        key={promo.promoName}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 sm:px-6 py-3 text-text">{promo.promoName}</td>
                        <td className="px-4 sm:px-6 py-3 text-text text-right tabular-nums">
                          {promo.timesUsed}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-text text-right tabular-nums">
                          {formatPrice(promo.totalDiscount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-8">
                <EmptyState
                  icon={Tag}
                  title="No promo usage yet"
                  description="Promotion stats will appear when customers use promo codes."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
