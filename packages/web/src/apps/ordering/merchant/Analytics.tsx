import { useMemo, useState } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, BarChart3, PackageOpen, Tag, CalendarDays, Printer, Download, Star, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@web/components/ui';
import { EmptyState } from '@web/components/patterns';
import { formatPrice } from '@web/lib/format';
import { useT } from '@web/lib/i18n';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import {
  useDailyRevenue,
  useTopItems,
  usePeakHours,
  useOrderStats,
  usePromoStats,
  useDailySummary,
  useFeedbackSummary,
  useFeedbackList,
} from '../hooks/useAnalytics';
import type { DailyRevenue, PeakHour, DailySummary } from '../hooks/useAnalytics';

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
  const t = useT();
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
      <EmptyState icon={BarChart3} title={t('No revenue data')} description={t('Orders will appear here once placed.')} />
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
// Daily Summary / EOD Report
// ---------------------------------------------------------------------------

function printDailyReport(summary: DailySummary, tenantName: string) {
  const printWindow = window.open('', '_blank', 'width=500,height=700');
  if (!printWindow) return;

  const topItemsHtml = summary.topItems
    .map(
      (item, idx) =>
        `<tr><td>${idx + 1}. ${item.name}</td><td class="right">${item.quantity}</td><td class="right">${formatPrice(item.revenue)}</td></tr>`,
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>EOD Report - ${summary.date}</title>
<style>
  @page { margin: 20px; }
  body { font-family: Arial, sans-serif; font-size: 13px; max-width: 500px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin: 16px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { padding: 4px 8px; text-align: left; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .muted { color: #666; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
  .stat-value { font-size: 20px; font-weight: bold; }
  .stat-label { font-size: 11px; color: #666; }
</style></head><body>
  <h1>${tenantName} - Daily Report</h1>
  <p class="muted">${summary.date}</p>

  <div class="grid">
    <div class="stat"><div class="stat-value">${formatPrice(summary.totalRevenue)}</div><div class="stat-label">Revenue</div></div>
    <div class="stat"><div class="stat-value">${summary.totalOrders}</div><div class="stat-label">Orders</div></div>
    <div class="stat"><div class="stat-value">${formatPrice(summary.avgOrderValue)}</div><div class="stat-label">Avg Order</div></div>
    <div class="stat"><div class="stat-value">${formatPrice(summary.totalTax)}</div><div class="stat-label">GST Collected</div></div>
  </div>

  <h2>Payment Breakdown</h2>
  <table>
    <tr><td>Paid</td><td class="right">${summary.paymentBreakdown.paid.count} orders</td><td class="right bold">${formatPrice(summary.paymentBreakdown.paid.amount)}</td></tr>
    <tr><td>Unpaid</td><td class="right">${summary.paymentBreakdown.unpaid.count} orders</td><td class="right">${formatPrice(summary.paymentBreakdown.unpaid.amount)}</td></tr>
    <tr><td>Refunded</td><td class="right">${summary.paymentBreakdown.refunded.count} orders</td><td class="right">${formatPrice(summary.paymentBreakdown.refunded.amount)}</td></tr>
  </table>

  ${summary.cancelledOrders > 0 ? `<h2>Cancellations</h2><p>${summary.cancelledOrders} cancelled orders (${formatPrice(summary.cancelledAmount)})</p>` : ''}

  ${summary.totalDiscounts > 0 ? `<p>Total discounts: ${formatPrice(summary.totalDiscounts)}</p>` : ''}

  <h2>Top Items</h2>
  <table>
    <tr><th>Item</th><th class="right">Qty</th><th class="right">Revenue</th></tr>
    ${topItemsHtml}
  </table>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function DailySummarySection({ summary, tenantName }: { summary: DailySummary; tenantName: string }) {
  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={formatPrice(summary.totalRevenue)}
          subtitle={`${summary.totalOrders} orders`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Order"
          value={formatPrice(summary.avgOrderValue)}
          subtitle="per order"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="GST Collected"
          value={formatPrice(summary.totalTax)}
          subtitle="15% GST"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Discounts"
          value={formatPrice(summary.totalDiscounts)}
          subtitle={`${summary.cancelledOrders} cancelled`}
          icon={<Tag className="h-5 w-5" />}
        />
      </div>

      {/* Payment breakdown + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Paid</Badge>
                  <span className="text-sm text-text-secondary">
                    {summary.paymentBreakdown.paid.count} orders
                  </span>
                </div>
                <span className="text-sm font-semibold text-text">
                  {formatPrice(summary.paymentBreakdown.paid.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Unpaid</Badge>
                  <span className="text-sm text-text-secondary">
                    {summary.paymentBreakdown.unpaid.count} orders
                  </span>
                </div>
                <span className="text-sm font-semibold text-text">
                  {formatPrice(summary.paymentBreakdown.unpaid.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="error">Refunded</Badge>
                  <span className="text-sm text-text-secondary">
                    {summary.paymentBreakdown.refunded.count} orders
                  </span>
                </div>
                <span className="text-sm font-semibold text-text">
                  {formatPrice(summary.paymentBreakdown.refunded.amount)}
                </span>
              </div>
            </div>
            {summary.cancelledOrders > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-sm text-text-secondary">
                  {summary.cancelledOrders} cancelled order{summary.cancelledOrders !== 1 ? 's' : ''}{' '}
                  ({formatPrice(summary.cancelledAmount)})
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.topItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary">Item</th>
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary text-right">Qty</th>
                      <th className="px-4 sm:px-6 py-3 font-medium text-text-secondary text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topItems.map((item, idx) => (
                      <tr key={item.name} className="border-b border-border last:border-b-0">
                        <td className="px-4 sm:px-6 py-3 text-text">
                          <span className="text-text-tertiary mr-2">{idx + 1}.</span>
                          {item.name}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-text text-right tabular-nums">{item.quantity}</td>
                        <td className="px-4 sm:px-6 py-3 text-text text-right tabular-nums">{formatPrice(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-8">
                <EmptyState icon={PackageOpen} title="No sales data" description="No items sold on this date." />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print button */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => printDailyReport(summary, tenantName)}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV Export Helper
// ---------------------------------------------------------------------------

async function downloadOrdersCsv(
  tenantSlug: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const apiBase = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, '/');
  const token = localStorage.getItem('nexus_token');

  const params = new URLSearchParams({ startDate, endDate, format: 'csv' });
  const url = `${apiBase}/t/${tenantSlug}/ordering/orders/export?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Export failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `orders-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

// ---------------------------------------------------------------------------
// Analytics Page
// ---------------------------------------------------------------------------

const DATE_RANGE_PRESETS = [7, 30, 90, 365] as const;

function DateRangeLabel(days: number): string {
  if (days === 365) return 'All';
  return `${days}d`;
}

type AnalyticsTab = 'overview' | 'daily-summary' | 'feedback';

export function Analytics() {
  const { tenantSlug, tenant } = useTenant();
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [summaryDate, setSummaryDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = days === 365
      ? '2000-01-01'
      : new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setExporting(true);
    try {
      await downloadOrdersCsv(tenantSlug, startDate, endDate);
      toast('success', 'Orders exported successfully');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const { data: stats, isLoading: statsLoading } = useOrderStats(tenantSlug);
  const { data: revenue, isLoading: revenueLoading } = useDailyRevenue(tenantSlug, days);
  const { data: peakHours, isLoading: peakLoading } = usePeakHours(tenantSlug, days);
  const { data: topItems, isLoading: topLoading } = useTopItems(tenantSlug, 10, days);
  const { data: promoStats, isLoading: promoLoading } = usePromoStats(tenantSlug);
  const { data: dailySummary, isLoading: summaryLoading } = useDailySummary(tenantSlug, summaryDate);

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

        {/* Tab switcher + Export */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={[
              'px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-md transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              activeTab === 'overview'
                ? 'bg-primary text-text-inverse'
                : 'bg-bg-muted text-text-secondary hover:bg-bg-surface',
            ].join(' ')}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('daily-summary')}
            className={[
              'px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              activeTab === 'daily-summary'
                ? 'bg-primary text-text-inverse'
                : 'bg-bg-muted text-text-secondary hover:bg-bg-surface',
            ].join(' ')}
          >
            <CalendarDays className="h-4 w-4" />
            Daily Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={[
              'px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              activeTab === 'feedback'
                ? 'bg-primary text-text-inverse'
                : 'bg-bg-muted text-text-secondary hover:bg-bg-surface',
            ].join(' ')}
          >
            <Star className="h-4 w-4" />
            Feedback
          </button>
          <Button
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Daily Summary Tab */}
      {activeTab === 'daily-summary' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={summaryDate}
              onChange={(e) => setSummaryDate(e.target.value)}
              label="Date"
              className="w-48"
            />
          </div>
          {summaryLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : dailySummary ? (
            <DailySummarySection summary={dailySummary} tenantName={tenant?.name ?? 'Restaurant'} />
          ) : (
            <EmptyState icon={CalendarDays} title="No data" description="Select a date to view the daily summary." />
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
        <div className="flex justify-end gap-2">
          {DATE_RANGE_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={[
                'px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-md transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                days === d
                  ? 'bg-primary text-text-inverse'
                  : 'bg-bg-muted text-text-secondary hover:bg-bg-surface',
              ].join(' ')}
            >
              {DateRangeLabel(d)}
            </button>
          ))}
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
            <CardTitle>Top 10 Items ({days === 365 ? 'All Time' : `Last ${days} Days`})</CardTitle>
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
      </>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <FeedbackSection tenantSlug={tenantSlug} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback Section (separate component to isolate hooks)
// ---------------------------------------------------------------------------

function FeedbackSection({ tenantSlug }: { tenantSlug: string }) {
  const { data: summary } = useFeedbackSummary(tenantSlug);
  const [page, setPage] = useState(1);
  const { data: feedbackPage } = useFeedbackList(tenantSlug, page);

  const entries = feedbackPage?.data ?? [];
  const total = feedbackPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={[
                      'h-5 w-5',
                      n <= Math.round(summary.avgRating)
                        ? 'fill-warning text-warning'
                        : 'text-border',
                    ].join(' ')}
                  />
                ))}
              </div>
              <p className="text-2xl font-bold text-text tabular-nums">
                {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-text-secondary">Average Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-text tabular-nums">{summary.totalCount}</p>
              <p className="text-xs text-text-secondary">Total Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-text-secondary mb-2 text-center">Rating Breakdown</p>
              {[5, 4, 3, 2, 1].map((n) => {
                const count = summary.ratingBreakdown[String(n)] ?? 0;
                const pct = summary.totalCount > 0 ? (count / summary.totalCount) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-text-secondary tabular-nums">{n}</span>
                    <Star className="h-3 w-3 fill-warning text-warning shrink-0" />
                    <div className="flex-1 h-2 bg-bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-text-tertiary tabular-nums">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Recent Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((fb) => (
                <div key={fb.id} className="flex gap-3 p-3 rounded-lg bg-bg-muted">
                  <div className="shrink-0 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={[
                          'h-3.5 w-3.5',
                          n <= fb.rating ? 'fill-warning text-warning' : 'text-border',
                        ].join(' ')}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    {fb.comment && (
                      <p className="text-sm text-text">{fb.comment}</p>
                    )}
                    <p className="text-xs text-text-tertiary mt-1">
                      Table {fb.tableNumber} · {new Date(fb.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-text-secondary">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={Star}
                title="No feedback yet"
                description="Customer feedback will appear here after orders are delivered."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
