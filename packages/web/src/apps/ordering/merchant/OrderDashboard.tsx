import { useState, useMemo } from 'react';
import { Clock, ShoppingBag, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, Printer, CreditCard, HelpCircle } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_FLOW,
  ORDER_FLOW_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@nexus/shared';
import type { OrderStatus, PaymentStatus } from '@nexus/shared';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
} from '@web/components/ui';
import { StatusBadge, EmptyState, ConfirmButton } from '@web/components/patterns';
import { formatPrice, timeAgo } from '@web/lib/format';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import { useTour } from '@web/platform/TourProvider';
import { useOrders, useUpdateOrderStatus, useHandleCancellationRequest, useUpdatePaymentStatus } from '../hooks/useOrders';
import { staffOnboardingSteps, STAFF_TOUR_ID } from '../tours/staffTour';
import { cleanupStaffTourData } from '../tours/cleanup';
import type { Order } from '../types';
import { OrderReceipt } from './OrderReceipt';

// ---------------------------------------------------------------------------
// Order status flow — derived from shared constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
];

// ---------------------------------------------------------------------------
// StatusBadge variant map for orders
// ---------------------------------------------------------------------------

const ORDER_STATUS_MAP = {
  pending: 'warning' as const,
  confirmed: 'info' as const,
  preparing: 'warning' as const,
  ready: 'success' as const,
  delivered: 'default' as const,
  cancelled: 'error' as const,
};

const PAYMENT_STATUS_MAP = {
  unpaid: 'warning' as const,
  paid: 'success' as const,
  refunded: 'error' as const,
};

// ---------------------------------------------------------------------------
// Print receipt helper
// ---------------------------------------------------------------------------

function printReceipt(order: Order, tenantName: string) {
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) return;

  const receiptHtml = OrderReceipt.toHtml(order, tenantName);
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// ---------------------------------------------------------------------------
// Single order card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  onUpdateStatus,
  isUpdating,
  onHandleCancellation,
  isCancellationPending,
  onUpdatePaymentStatus,
  isPaymentUpdating,
  tenantName,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  isUpdating: boolean;
  onHandleCancellation: (orderId: string, itemId: string, action: 'approve' | 'reject') => void;
  isCancellationPending: boolean;
  onUpdatePaymentStatus: (id: string, paymentStatus: PaymentStatus) => void;
  isPaymentUpdating: boolean;
  tenantName: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const nextStatus = ORDER_STATUS_FLOW[order.status];
  const nextLabel = ORDER_FLOW_LABELS[order.status];

  const cancelRequestCount = order.items.filter(
    (item) => (item.status ?? 'active') === 'cancel_requested',
  ).length;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <CardContent className="flex items-center justify-between gap-3 sm:gap-4 py-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="shrink-0 h-10 w-10 rounded-full bg-bg-muted flex items-center justify-center">
              <span className="text-sm font-bold text-text">
                {order.tableNumber}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">
                Table {order.tableNumber}
              </p>
              <p className="text-xs text-text-secondary">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {cancelRequestCount > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {cancelRequestCount} cancel req
              </Badge>
            )}
            <div className="text-right">
              <p className="text-sm font-semibold text-text">
                {formatPrice(order.total)}
              </p>
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <Clock className="h-3 w-3" />
                {timeAgo(order.createdAt)}
              </div>
            </div>
            <StatusBadge status={order.status} statusMap={ORDER_STATUS_MAP} />
            <StatusBadge
              status={order.paymentStatus ?? 'unpaid'}
              statusMap={PAYMENT_STATUS_MAP}
            />
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            )}
          </div>
        </CardContent>
      </button>

      {expanded && (
        <div className="border-t border-border">
          <CardContent>
            {/* Order items list */}
            <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-secondary">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium text-center">Qty</th>
                  <th className="pb-2 font-medium text-right">Price</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => {
                  const itemStatus = item.status ?? 'active';
                  const isCancelRequested = itemStatus === 'cancel_requested';
                  const isItemCancelled = itemStatus === 'cancelled';

                  return (
                    <tr
                      key={item.id}
                      className={[
                        isCancelRequested ? 'bg-warning-light/30' : '',
                        isItemCancelled ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      <td className="py-2 text-text">
                        <span className={isItemCancelled ? 'line-through text-text-tertiary' : ''}>
                          {item.name}
                        </span>
                        {item.modifiersJson && (() => {
                          try {
                            const raw = JSON.parse(item.modifiersJson) as unknown;
                            let modNames: string[] = [];
                            if (Array.isArray(raw)) {
                              modNames = raw.map((m: { name: string }) => m.name);
                            } else if (raw && typeof raw === 'object' && 'itemModifiers' in raw) {
                              const obj = raw as { itemModifiers: { name: string }[] };
                              modNames = obj.itemModifiers.map((m) => m.name);
                            }
                            if (modNames.length === 0) return null;
                            return <span className="text-xs text-text-secondary ml-1">({modNames.join(', ')})</span>;
                          } catch { return null; }
                        })()}
                        {item.notes && (
                          <p className="text-xs text-text-tertiary mt-0.5">
                            Note: {item.notes}
                          </p>
                        )}
                        {/* Cancellation action buttons */}
                        {isCancelRequested && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onHandleCancellation(order.id, item.id, 'approve');
                              }}
                              disabled={isCancellationPending}
                            >
                              Accept Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onHandleCancellation(order.id, item.id, 'reject');
                              }}
                              disabled={isCancellationPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center text-text-secondary">
                        {item.quantity}
                      </td>
                      <td className={[
                        'py-2 text-right',
                        isItemCancelled ? 'text-text-tertiary line-through' : 'text-text',
                      ].join(' ')}>
                        {formatPrice(item.price * item.quantity)}
                      </td>
                      <td className="py-2 text-right">
                        {isCancelRequested && (
                          <Badge variant="warning">Cancel Requested</Badge>
                        )}
                        {isItemCancelled && (
                          <Badge variant="error">Cancelled</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="pt-2 font-semibold text-text" colSpan={3}>
                    Total
                  </td>
                  <td className="pt-2 text-right font-semibold text-text">
                    {formatPrice(order.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>

            {order.notes && (
              <p className="mt-3 text-xs text-text-secondary bg-bg-muted rounded-md p-2">
                Order note: {order.notes}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {nextStatus && nextLabel && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(order.id, nextStatus);
                  }}
                  loading={isUpdating}
                >
                  {nextLabel}
                </Button>
              )}

              {/* Payment status toggle */}
              {(order.paymentStatus ?? 'unpaid') !== 'paid' && order.status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePaymentStatus(order.id, 'paid');
                  }}
                  loading={isPaymentUpdating}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  Mark Paid
                </Button>
              )}
              {(order.paymentStatus ?? 'unpaid') === 'paid' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePaymentStatus(order.id, 'refunded');
                  }}
                  loading={isPaymentUpdating}
                >
                  Refund
                </Button>
              )}

              {/* Print receipt */}
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  printReceipt(order, tenantName);
                }}
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>

              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <ConfirmButton
                  variant="destructive"
                  size="sm"
                  onConfirm={() => onUpdateStatus(order.id, 'cancelled')}
                  confirmText="Cancel this order?"
                  disabled={isUpdating}
                >
                  Cancel Order
                </ConfirmButton>
              )}
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Onboarding step card for new restaurants
// ---------------------------------------------------------------------------

interface OnboardingStepProps {
  number: number;
  title: string;
  description: string;
  link: string;
}

function OnboardingStep({ number, title, description, link }: OnboardingStepProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center">
          <span className="text-sm font-bold text-text-inverse">{number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text">{title}</p>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
        <Link to={link}>
          <Button variant="secondary" size="sm">
            Go <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export function OrderDashboard() {
  const { tenantSlug, tenant } = useTenant();

  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter) f.status = statusFilter;
    if (tableFilter) f.tableNumber = tableFilter;
    return f;
  }, [statusFilter, tableFilter]);

  const ordersQuery = useOrders(tenantSlug, filters);
  const orders = ordersQuery.data ?? [];

  const { toast } = useToast();
  const { startTour } = useTour();
  const updateStatus = useUpdateOrderStatus(tenantSlug);
  const handleCancellation = useHandleCancellationRequest(tenantSlug);
  const updatePayment = useUpdatePaymentStatus(tenantSlug);

  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          toast('success', `Order status updated to ${status}`);
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to update order status');
        },
      },
    );
  };

  const handleUpdatePaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    updatePayment.mutate(
      { id, paymentStatus },
      {
        onSuccess: () => {
          toast('success', `Payment marked as ${PAYMENT_STATUS_LABELS[paymentStatus]}`);
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to update payment status');
        },
      },
    );
  };

  const handleCancellationRequest = (orderId: string, itemId: string, action: 'approve' | 'reject') => {
    handleCancellation.mutate(
      { orderId, itemId, action },
      {
        onSuccess: () => {
          toast('success', action === 'approve' ? 'Item cancelled' : 'Cancellation rejected');
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to handle cancellation');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Orders</h1>
        <p className="text-xs text-text-tertiary">
          Auto-refreshes every 10s
        </p>
      </div>

      {/* Filter bar */}
      <Card data-tour="order-filters">
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              label="Status"
            />
          </div>
          <div className="w-full sm:w-48">
            <Input
              label="Table Number"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Order list */}
      {ordersQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-secondary">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <>
          <EmptyState
            icon={ShoppingBag}
            title="No orders"
            description={
              statusFilter || tableFilter
                ? 'No orders match your filters. Try adjusting them.'
                : 'No orders yet. Orders will appear here when customers place them.'
            }
          />
          {/* Onboarding checklist for new restaurants (no orders, no filters) */}
          {!statusFilter && !tableFilter && (
            <div className="space-y-4 mt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-text">Welcome to your restaurant!</h2>
                  <p className="text-sm text-text-secondary mt-1">Let&apos;s get you set up. Follow these steps:</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void cleanupStaffTourData(tenantSlug);
                    startTour(staffOnboardingSteps, STAFF_TOUR_ID, () => cleanupStaffTourData(tenantSlug));
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                  Take a Guided Tour
                </Button>
              </div>
              <div className="space-y-3">
                <OnboardingStep
                  number={1}
                  title="Set up your menu"
                  description="Add categories and items for customers to browse"
                  link={`/t/${tenantSlug}/ordering/menu`}
                />
                <OnboardingStep
                  number={2}
                  title="Configure modifiers"
                  description="Add sizes, toppings, and other customizations"
                  link={`/t/${tenantSlug}/ordering/modifiers`}
                />
                <OnboardingStep
                  number={3}
                  title="Customize your theme"
                  description="Set your brand colors, logo, and operating hours"
                  link={`/t/${tenantSlug}/ordering/settings`}
                />
                <OnboardingStep
                  number={4}
                  title="Generate QR codes"
                  description="Print codes for your tables so customers can order"
                  link={`/t/${tenantSlug}/ordering/qr`}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdateStatus={handleUpdateStatus}
              isUpdating={
                updateStatus.isPending &&
                updateStatus.variables?.id === order.id
              }
              onHandleCancellation={handleCancellationRequest}
              isCancellationPending={handleCancellation.isPending}
              onUpdatePaymentStatus={handleUpdatePaymentStatus}
              isPaymentUpdating={
                updatePayment.isPending &&
                updatePayment.variables?.id === order.id
              }
              tenantName={tenant?.name ?? 'Restaurant'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
