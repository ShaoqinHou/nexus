import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  ChefHat,
  Bell,
  Truck,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@web/lib/api';
import { Button } from '@web/components/ui';
import { StatusBadge } from '@web/components/patterns';
import { orderingKeys } from '@web/apps/ordering/hooks/keys';
import type { Order, OrderStatus, SnapshotModifier } from '@web/apps/ordering/types';

interface OrderConfirmationProps {
  tenantSlug: string;
  orderId: string;
  onBackToMenu: () => void;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
];

const STATUS_ICONS: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  preparing: ChefHat,
  ready: Bell,
  delivered: Truck,
  cancelled: Clock,
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function getStatusIndex(status: OrderStatus): number {
  return ORDER_STATUSES.indexOf(status);
}

function StatusTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentIndex = getStatusIndex(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="flex items-center justify-between w-full px-2">
      {ORDER_STATUSES.map((status, index) => {
        const Icon = STATUS_ICONS[status];
        const isCompleted = !isCancelled && index <= currentIndex;
        const isCurrent = !isCancelled && index === currentIndex;

        return (
          <div key={status} className="flex flex-col items-center gap-1.5 relative flex-1">
            {/* Connector line */}
            {index > 0 && (
              <div
                className={[
                  'absolute top-3.5 right-1/2 w-full h-0.5 -translate-y-1/2',
                  !isCancelled && index <= currentIndex
                    ? 'bg-primary'
                    : 'bg-border',
                ].join(' ')}
                style={{ left: '-50%' }}
              />
            )}

            {/* Icon circle */}
            <div
              className={[
                'relative z-10 h-7 w-7 rounded-full flex items-center justify-center transition-colors',
                isCurrent
                  ? 'bg-primary text-text-inverse ring-4 ring-primary/20'
                  : isCompleted
                    ? 'bg-primary text-text-inverse'
                    : 'bg-bg-muted text-text-tertiary',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            {/* Label */}
            <span
              className={[
                'text-xs font-medium text-center leading-tight',
                isCurrent
                  ? 'text-primary'
                  : isCompleted
                    ? 'text-text'
                    : 'text-text-tertiary',
              ].join(' ')}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function OrderConfirmation({
  tenantSlug,
  orderId,
  onBackToMenu,
}: OrderConfirmationProps) {
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: orderingKeys.order(orderId),
    queryFn: () =>
      apiClient.get<{ data: Order }>(`/order/${tenantSlug}/ordering/orders/${orderId}`),
    select: (res) => res.data,
    refetchInterval: (query) => {
      const data = query.state.data as Order | undefined;
      // Stop polling once delivered or cancelled
      if (data?.status === 'delivered' || data?.status === 'cancelled') {
        return false;
      }
      return 5000;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 text-center">
        <p className="text-text-secondary text-sm mb-4">
          Unable to load order details.
        </p>
        <Button variant="secondary" onClick={onBackToMenu}>
          <ArrowLeft className="h-4 w-4" />
          Back to Menu
        </Button>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="p-4 flex flex-col gap-5 pb-8">
      {/* Success header */}
      <div className="text-center pt-4">
        {isCancelled ? (
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-danger-light mb-3">
            <Clock className="h-7 w-7 text-danger" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-success-light mb-3">
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
        )}
        <h2 className="text-xl font-bold text-text">
          {isCancelled ? 'Order Cancelled' : 'Order Placed!'}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          {isCancelled
            ? 'Your order has been cancelled.'
            : isDelivered
              ? 'Your order has been delivered. Enjoy!'
              : 'Your order is being processed.'}
        </p>
      </div>

      {/* Order info */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-bg-muted">
        <div>
          <p className="text-xs text-text-secondary">Order</p>
          <p className="text-sm font-semibold text-text">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">Table</p>
          <p className="text-sm font-semibold text-text">{order.tableNumber}</p>
        </div>
        <div>
          <StatusBadge
            status={order.status}
            statusMap={{
              delivered: 'success',
              ready: 'info',
            }}
          />
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="py-2">
          <StatusTimeline currentStatus={order.status} />
        </div>
      )}

      {/* Order items */}
      <div className="rounded-lg border border-border bg-bg-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text">Order Items</h3>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-secondary bg-bg-muted rounded px-1.5 py-0.5">
                    x{item.quantity}
                  </span>
                  <span className="text-sm text-text truncate">
                    {item.name}
                  </span>
                </div>
                {item.modifiersJson && (() => {
                  try {
                    const mods = JSON.parse(item.modifiersJson) as SnapshotModifier[];
                    if (mods.length > 0) {
                      return (
                        <p className="text-xs text-text-tertiary mt-0.5 pl-8 line-clamp-2">
                          {mods.map((m) => m.price > 0 ? `${m.name} (+$${m.price.toFixed(2)})` : m.name).join(', ')}
                        </p>
                      );
                    }
                  } catch { /* ignore parse errors */ }
                  return null;
                })()}
                {item.notes && (
                  <p className="text-xs text-text-tertiary mt-0.5 pl-8">
                    {item.notes}
                  </p>
                )}
              </div>
              <span className="text-sm font-medium text-text whitespace-nowrap ml-2">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        {/* Total */}
        <div className="px-4 py-3 border-t border-border bg-bg-muted flex items-center justify-between">
          <span className="text-sm font-semibold text-text">Total</span>
          <span className="text-base font-bold text-text">
            {formatPrice(order.total)}
          </span>
        </div>
      </div>

      {/* Order notes */}
      {order.notes && (
        <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3">
          <p className="text-xs font-medium text-text-secondary mb-1">
            Order Notes
          </p>
          <p className="text-sm text-text">{order.notes}</p>
        </div>
      )}

      {/* Back to menu */}
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={onBackToMenu}
      >
        Place Another Order
      </Button>
    </div>
  );
}
