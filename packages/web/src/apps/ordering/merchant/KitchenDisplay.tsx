import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  ChefHat,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  ORDER_STATUS_FLOW,
  ORDER_FLOW_LABELS,
} from '@nexus/shared';
import type { OrderStatus } from '@nexus/shared';
import { Button } from '@web/components/ui';
import { ConfirmButton } from '@web/components/patterns';
import { formatPrice, timeAgo } from '@web/lib/format';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useAuth } from '@web/platform/auth/AuthProvider';
import { useToast } from '@web/platform/ToastProvider';
import { useUpdateOrderStatus } from '../hooks/useOrders';
import type { Order } from '../types';

// ---------------------------------------------------------------------------
// Kitchen status columns
// ---------------------------------------------------------------------------

const KITCHEN_COLUMNS: {
  status: OrderStatus;
  label: string;
  colorClass: string;
  headerBg: string;
}[] = [
  {
    status: 'pending',
    label: 'New',
    colorClass: 'border-warning',
    headerBg: 'bg-warning-light text-warning',
  },
  {
    status: 'confirmed',
    label: 'Confirmed',
    colorClass: 'border-info',
    headerBg: 'bg-primary-light text-primary',
  },
  {
    status: 'preparing',
    label: 'Preparing',
    colorClass: 'border-[#7c3aed]',
    headerBg: 'bg-[#ede9fe] text-[#7c3aed] dark:bg-[#2e1065] dark:text-[#a78bfa]',
  },
  {
    status: 'ready',
    label: 'Ready',
    colorClass: 'border-success',
    headerBg: 'bg-success-light text-success',
  },
];

// ---------------------------------------------------------------------------
// SSE hook — connects to kitchen stream
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, '/');

function useKitchenSSE(tenantSlug: string, token: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE}/t/${tenantSlug}/kitchen/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('orders', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { type: string; orders: Order[] };
        setOrders(data.orders);
        setConnected(true);
        setError(null);
      } catch {
        // Ignore parse errors
      }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Reconnect after 5 seconds
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };
  }, [tenantSlug, token]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  return { orders, connected, error, reconnect };
}

// ---------------------------------------------------------------------------
// Kitchen order card
// ---------------------------------------------------------------------------

function KitchenOrderCard({
  order,
  onAdvance,
  onCancel,
  isUpdating,
  completedItems,
  onToggleItem,
}: {
  order: Order;
  onAdvance: (id: string, status: OrderStatus) => void;
  onCancel: (id: string) => void;
  isUpdating: boolean;
  completedItems: Set<string>;
  onToggleItem: (itemId: string) => void;
}) {
  const nextStatus = ORDER_STATUS_FLOW[order.status];
  const nextLabel = ORDER_FLOW_LABELS[order.status];

  // Time elapsed since order was placed — pulsing urgency for old orders
  const now = Date.now();
  const elapsedMs = now - new Date(order.createdAt).getTime();
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const isUrgent = elapsedMin >= 15;
  const isWarning = elapsedMin >= 8 && elapsedMin < 15;

  return (
    <div
      className={[
        'rounded-lg border-2 bg-bg-elevated shadow-sm overflow-hidden transition-all',
        isUrgent
          ? 'border-danger animate-pulse'
          : isWarning
            ? 'border-warning'
            : 'border-border',
      ].join(' ')}
    >
      {/* Header — table number + time + total */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-muted border-b border-border">
        <div>
          <span className="text-3xl font-black text-text leading-none">
            T{order.tableNumber}
          </span>
          <span className="text-sm font-semibold text-text-secondary ml-2">
            {formatPrice(order.total)}
          </span>
        </div>
        <div
          className={[
            'flex items-center gap-1.5 text-sm font-semibold',
            isUrgent
              ? 'text-danger'
              : isWarning
                ? 'text-warning'
                : 'text-text-secondary',
          ].join(' ')}
        >
          <Clock className="h-4 w-4" />
          {timeAgo(order.createdAt)}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2.5">
        {order.items.filter((item) => item.status !== 'cancelled').map((item) => {
          const isDone = completedItems.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggleItem(item.id)}
              className={[
                'w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left transition-all cursor-pointer',
                item.status === 'cancel_requested'
                  ? 'bg-warning-light/20 border border-warning/30'
                  : 'bg-bg-muted/50',
                isDone ? 'opacity-50' : '',
              ].join(' ')}
            >
              {/* Completion checkbox */}
              <span className={[
                'mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
                isDone
                  ? 'bg-success border-success text-white'
                  : 'border-border-strong bg-bg',
              ].join(' ')}>
                {isDone && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={[
                'text-xl font-black leading-tight shrink-0 min-w-[2rem] text-center',
                isDone ? 'text-text-tertiary' : 'text-primary',
              ].join(' ')}>
                {item.quantity}x
              </span>
              <div className="min-w-0 flex-1">
                <p className={[
                  'text-base font-bold leading-tight',
                  isDone ? 'line-through text-text-tertiary' : 'text-text',
                ].join(' ')}>
                  {item.name}
                </p>
                {item.modifiersJson && (() => {
                  try {
                    const raw = JSON.parse(item.modifiersJson);
                    // Handle both array format and combo object format
                    let modNames: string[] = [];
                    if (Array.isArray(raw)) {
                      modNames = raw.map((m: { name: string }) => m.name);
                    } else if (raw && typeof raw === 'object') {
                      // Combo format: { comboName, slotName, priceModifier, itemModifiers? }
                      if (raw.slotName) modNames.push(raw.slotName);
                      if (raw.itemModifiers) {
                        modNames.push(...(raw.itemModifiers as Array<{ name: string }>).map((m) => m.name));
                      }
                    }
                    if (modNames.length === 0) return null;
                    return (
                      <p className={[
                        'text-sm font-semibold mt-1',
                        isDone ? 'text-text-tertiary line-through' : 'text-primary',
                      ].join(' ')}>
                        {modNames.join(' · ')}
                      </p>
                    );
                  } catch {
                    return null;
                  }
                })()}
                {item.notes && (
                  <p className={[
                    'text-sm font-semibold mt-1',
                    isDone ? 'text-text-tertiary line-through' : 'text-warning',
                  ].join(' ')}>
                    {isDone ? item.notes : `⚠ ${item.notes}`}
                  </p>
                )}
                {item.status === 'cancel_requested' && (
                  <p className="text-sm font-bold text-danger mt-1">
                    CANCEL REQUESTED
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Order notes */}
      {order.notes && (
        <div className="mx-4 mb-3 rounded-md bg-warning-light px-3 py-2">
          <p className="text-sm font-medium text-warning">{order.notes}</p>
        </div>
      )}

      {/* Total */}
      <div className="px-4 pb-2">
        <p className="text-xs text-text-tertiary">
          {order.items.length} item{order.items.length !== 1 ? 's' : ''} &middot; {formatPrice(order.total)}
        </p>
      </div>

      {/* All items ready prompt */}
      {(() => {
        const activeItems = order.items.filter((item) => item.status !== 'cancelled');
        const allDone = activeItems.length > 0 && activeItems.every((item) => completedItems.has(item.id));
        if (!allDone || !nextStatus || !nextLabel) return null;
        return (
          <div className="mx-4 mb-2 rounded-md bg-success-light px-3 py-2 text-center">
            <p className="text-sm font-bold text-success">
              All items ready — advance order?
            </p>
          </div>
        );
      })()}

      {/* Action */}
      <div className="px-4 pb-4 flex gap-2">
        {nextStatus && nextLabel && (
          <Button
            size="lg"
            className="flex-1 text-base font-bold"
            onClick={() => onAdvance(order.id, nextStatus)}
            loading={isUpdating}
          >
            {nextLabel}
          </Button>
        )}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <ConfirmButton
            variant="destructive"
            size="lg"
            onConfirm={() => onCancel(order.id)}
            confirmText="Cancel?"
            disabled={isUpdating}
          >
            Cancel
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Kitchen Display
// ---------------------------------------------------------------------------

export function KitchenDisplay() {
  const { tenantSlug, tenant } = useTenant();
  const { token } = useAuth();
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatus(tenantSlug);

  const { orders, connected, reconnect } = useKitchenSSE(tenantSlug, token);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const toggleItemDone = useCallback((itemId: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  // Track previous order count for new-order sound
  const prevOrderCountRef = useRef(orders.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Group orders by status
  const ordersByStatus = new Map<OrderStatus, Order[]>();
  for (const col of KITCHEN_COLUMNS) {
    ordersByStatus.set(col.status, []);
  }
  for (const order of orders) {
    const bucket = ordersByStatus.get(order.status as OrderStatus);
    if (bucket) {
      bucket.push(order);
    }
  }

  // New-order sound notification
  const pendingCount = ordersByStatus.get('pending')?.length ?? 0;
  useEffect(() => {
    if (soundEnabled && pendingCount > prevOrderCountRef.current) {
      // Play a beep using Web Audio API
      try {
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gain.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch {
        // Audio not available
      }
    }
    prevOrderCountRef.current = pendingCount;
  }, [pendingCount, soundEnabled]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // Fullscreen not supported
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        // Exit fullscreen failed
      });
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Status update handlers
  const handleAdvance = (orderId: string, status: OrderStatus) => {
    updateStatus.mutate(
      { id: orderId, status },
      {
        onSuccess: () => {
          toast('success', `Order updated`);
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to update order');
        },
      },
    );
  };

  const handleCancel = (orderId: string) => {
    updateStatus.mutate(
      { id: orderId, status: 'cancelled' as OrderStatus },
      {
        onSuccess: () => {
          toast('success', 'Order cancelled');
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to cancel order');
        },
      },
    );
  };

  // Current time display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-bg-elevated border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <ChefHat className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-text">
            {tenant?.name ?? tenantSlug} Kitchen
          </h1>
          <div
            className={[
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              connected
                ? 'bg-success-light text-success'
                : 'bg-danger-light text-danger',
            ].join(' ')}
          >
            {connected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {connected ? 'Live' : 'Disconnected'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary font-mono hidden sm:inline">
            {currentTime.toLocaleTimeString()}
          </span>

          <button
            type="button"
            onClick={reconnect}
            className="p-2 rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
            title="Reconnect"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
            title={soundEnabled ? 'Mute notifications' : 'Enable sound notifications'}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Kanban columns */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col md:flex-row gap-0 md:gap-0">
          {KITCHEN_COLUMNS.map((col) => {
            const colOrders = ordersByStatus.get(col.status) ?? [];
            return (
              <div
                key={col.status}
                className={[
                  'flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border last:border-b-0 last:border-r-0',
                  'flex-1 min-w-0',
                ].join(' ')}
              >
                {/* Column header */}
                <div
                  className={[
                    'flex items-center justify-between px-4 py-3 shrink-0 border-b-2',
                    col.headerBg,
                    col.colorClass,
                  ].join(' ')}
                >
                  <h2 className="text-lg font-bold">{col.label}</h2>
                  <span className="text-lg font-black">{colOrders.length}</span>
                </div>

                {/* Column body — scrollable */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                  {colOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-text-tertiary text-sm">
                      No orders
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        onAdvance={handleAdvance}
                        onCancel={handleCancel}
                        isUpdating={
                          updateStatus.isPending &&
                          updateStatus.variables?.id === order.id
                        }
                        completedItems={completedItems}
                        onToggleItem={toggleItemDone}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden audio element for future custom sound */}
      <audio ref={audioRef} preload="none" />
    </div>
  );
}
