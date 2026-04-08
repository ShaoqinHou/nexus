import { useState, useMemo } from 'react';
import { Clock, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
} from '@web/components/ui';
import { StatusBadge, EmptyState, ConfirmButton } from '@web/components/patterns';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import { useOrders, useUpdateOrderStatus } from '../hooks/useOrders';
import type { Order, OrderStatus } from '../types';

// ---------------------------------------------------------------------------
// Order status flow — what can transition to what
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm',
  confirmed: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Delivered',
};

// ---------------------------------------------------------------------------
// Time ago helper
// ---------------------------------------------------------------------------

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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

// ---------------------------------------------------------------------------
// Single order card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  onUpdateStatus,
  isUpdating,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const nextStatus = NEXT_STATUS[order.status];
  const nextLabel = NEXT_STATUS_LABEL[order.status];

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
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
            <div className="text-right">
              <p className="text-sm font-semibold text-text">
                ${order.total.toFixed(2)}
              </p>
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <Clock className="h-3 w-3" />
                {timeAgo(order.createdAt)}
              </div>
            </div>
            <StatusBadge status={order.status} statusMap={ORDER_STATUS_MAP} />
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 text-text">
                      {item.name}
                      {item.notes && (
                        <p className="text-xs text-text-tertiary mt-0.5">
                          Note: {item.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-2 text-center text-text-secondary">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right text-text">
                      ${(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="pt-2 font-semibold text-text" colSpan={2}>
                    Total
                  </td>
                  <td className="pt-2 text-right font-semibold text-text">
                    ${order.total.toFixed(2)}
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
// Main dashboard
// ---------------------------------------------------------------------------

export function OrderDashboard() {
  const { tenantSlug } = useTenant();

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
  const updateStatus = useUpdateOrderStatus(tenantSlug);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Orders</h1>
        <p className="text-xs text-text-tertiary">
          Auto-refreshes every 10s
        </p>
      </div>

      {/* Filter bar */}
      <Card>
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
        <EmptyState
          icon={ShoppingBag}
          title="No orders"
          description={
            statusFilter || tableFilter
              ? 'No orders match your filters. Try adjusting them.'
              : 'No orders yet. Orders will appear here when customers place them.'
          }
        />
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
