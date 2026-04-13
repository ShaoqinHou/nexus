import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  ChefHat,
  Bell,
  Truck,
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Phone,
  Star,
  Pencil,
  Check,
} from 'lucide-react';
import { ORDER_STATUSES, MODIFIABLE_ORDER_STATUSES } from '@nexus/shared';
import type { OrderStatus } from '@nexus/shared';
import { apiClient } from '@web/lib/api';
import { formatPrice } from '@web/lib/format';
import { useT } from '@web/lib/i18n';
import { Button, Badge } from '@web/components/ui';
import { StatusBadge } from '@web/components/patterns';
import { useToast } from '@web/platform/ToastProvider';
import { orderingKeys } from '@web/apps/ordering/hooks/keys';
import { useRequestItemCancellation, useUpdateItemNotes } from '@web/apps/ordering/hooks/useOrders';
import { useSubmitFeedback } from '@web/apps/ordering/hooks/useFeedback';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import type { Order, SnapshotModifier } from '@web/apps/ordering/types';

interface OrderConfirmationProps {
  tenantSlug: string;
  orderId: string;
  onBackToMenu: () => void;
  onAddItems?: (orderId: string) => void;
  taxLabel?: string;
  taxRate?: number;
  taxInclusive?: boolean;
}

// Timeline display statuses — excludes 'cancelled' which is shown differently
const TIMELINE_STATUSES = ORDER_STATUSES.filter((s): s is Exclude<OrderStatus, 'cancelled'> => s !== 'cancelled');

const STATUS_ICONS: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  preparing: ChefHat,
  ready: Bell,
  delivered: Truck,
  cancelled: Clock,
};

// Customer-facing timeline labels — "Order Placed" instead of generic "Pending"
const TIMELINE_LABELS: Record<OrderStatus, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function getStatusIndex(status: OrderStatus): number {
  return (TIMELINE_STATUSES as readonly string[]).indexOf(status);
}

function StatusTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const t = useT();
  const currentIndex = getStatusIndex(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <>
      {/* Mobile: vertical timeline */}
      <div className="flex flex-col gap-0 px-2 sm:hidden">
        {TIMELINE_STATUSES.map((status, index) => {
          const Icon = STATUS_ICONS[status];
          const isCompleted = !isCancelled && index <= currentIndex;
          const isCurrent = !isCancelled && index === currentIndex;
          const isLast = index === TIMELINE_STATUSES.length - 1;

          return (
            <div key={status} className="flex items-start gap-3">
              {/* Left column: icon + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    'h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    isCurrent
                      ? 'bg-primary text-text-inverse ring-4 ring-primary/20'
                      : isCompleted
                        ? 'bg-primary text-text-inverse'
                        : 'bg-bg-muted text-text-tertiary',
                  ].join(' ')}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {!isLast && (
                  <div
                    className={[
                      'w-0.5 h-5',
                      !isCancelled && index < currentIndex
                        ? 'bg-primary'
                        : 'bg-border',
                    ].join(' ')}
                  />
                )}
              </div>

              {/* Right column: label */}
              <span
                className={[
                  'text-sm font-medium pt-1',
                  isCurrent
                    ? 'text-primary'
                    : isCompleted
                      ? 'text-text'
                      : 'text-text-tertiary',
                ].join(' ')}
              >
                {t(TIMELINE_LABELS[status])}
              </span>
            </div>
          );
        })}
      </div>

      {/* sm+: horizontal timeline */}
      <div className="hidden sm:flex items-center justify-between w-full px-2">
        {TIMELINE_STATUSES.map((status, index) => {
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
                {t(TIMELINE_LABELS[status])}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function getFeedbackKey(orderId: string): string {
  return `nexus_feedback_${orderId}`;
}

function loadSubmittedFeedback(orderId: string): { rating: number; comment?: string } | null {
  try {
    const raw = localStorage.getItem(getFeedbackKey(orderId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveFeedback(orderId: string, rating: number, comment?: string): void {
  try {
    localStorage.setItem(getFeedbackKey(orderId), JSON.stringify({ rating, comment }));
  } catch {
    // localStorage may be unavailable
  }
}

function FeedbackSection({
  tenantSlug,
  orderId,
  tableNumber,
}: {
  tenantSlug: string;
  orderId: string;
  tableNumber: string;
}) {
  const t = useT();
  const { toast } = useToast();
  const submitFeedback = useSubmitFeedback(tenantSlug);
  const [submitted, setSubmitted] = useState<{ rating: number; comment?: string } | null>(
    () => loadSubmittedFeedback(orderId),
  );
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = useCallback(() => {
    if (rating === 0) return;
    submitFeedback.mutate(
      { orderId, tableNumber, rating, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          saveFeedback(orderId, rating, comment.trim() || undefined);
          setSubmitted({ rating, comment: comment.trim() || undefined });
          toast('success', t('Thank you for your feedback!'));
        },
        onError: () => {
          toast('error', t('Could not submit feedback. Please try again.'));
        },
      },
    );
  }, [orderId, tableNumber, rating, comment, submitFeedback, toast]);

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-bg-elevated px-4 py-4 text-center">
        <p className="text-sm font-semibold text-text mb-2">{t('Thanks for your feedback!')}</p>
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={[
                'h-5 w-5',
                star <= submitted.rating
                  ? 'text-warning fill-warning'
                  : 'text-text-tertiary',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-4 py-4">
      <h3 className="text-sm font-semibold text-text text-center mb-3">
        {t('How was your meal?')}
      </h3>

      {/* Star rating */}
      <div className="flex items-center justify-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={[
                'h-7 w-7 transition-colors',
                star <= (hoveredStar || rating)
                  ? 'text-warning fill-warning'
                  : 'text-text-tertiary',
              ].join(' ')}
            />
          </button>
        ))}
      </div>

      {/* Optional comment */}
      <textarea
        value={comment}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
        rows={2}
        placeholder={t('Tell us about your experience...')}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-primary mb-3"
      />

      {/* Submit button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleSubmit}
        disabled={rating === 0 || submitFeedback.isPending}
        loading={submitFeedback.isPending}
      >
        {t('Submit Feedback')}
      </Button>
    </div>
  );
}

function EditableItemNotes({
  itemId,
  orderId,
  initialNotes,
  tenantSlug,
}: {
  itemId: string;
  orderId: string;
  initialNotes: string | null;
  tenantSlug: string;
}) {
  const t = useT();
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNotes = useUpdateItemNotes(tenantSlug);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with server data when it changes (e.g. from polling)
  useEffect(() => {
    if (!editing) {
      setNotes(initialNotes ?? '');
    }
  }, [initialNotes, editing]);

  const save = useCallback(() => {
    const trimmed = notes.trim();
    // Only save if value actually changed
    if (trimmed === (initialNotes ?? '')) {
      setEditing(false);
      return;
    }
    updateNotes.mutate(
      { orderId, itemId, notes: trimmed },
      {
        onSuccess: () => {
          setSaved(true);
          setEditing(false);
          if (savedTimer.current) clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }, [notes, initialNotes, orderId, itemId, updateNotes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        setNotes(initialNotes ?? '');
        setEditing(false);
      }
    },
    [save, initialNotes],
  );

  if (!editing) {
    return (
      <div className="flex items-center gap-1 pl-8 mt-0.5">
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            // Focus the input after it renders
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-1 py-0.5"
        >
          <Pencil className="h-3 w-3" />
          {notes ? notes : t('Add note')}
        </button>
        {saved && (
          <span className="flex items-center gap-0.5 text-xs text-success">
            <Check className="h-3 w-3" />
            {t('Saved')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 pl-8 mt-1">
      <input
        ref={inputRef}
        type="text"
        value={notes}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder={t('Add a note...')}
        maxLength={500}
        className="flex-1 text-xs border border-border rounded px-2 py-1 bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {updateNotes.isPending && (
        <Loader2 className="h-3 w-3 animate-spin text-text-tertiary" />
      )}
    </div>
  );
}

export function OrderConfirmation({
  tenantSlug,
  orderId,
  onBackToMenu,
  onAddItems,
  taxLabel,
  taxRate,
  taxInclusive,
}: OrderConfirmationProps) {
  const t = useT();
  const { toast } = useToast();
  const cancelItems = useRequestItemCancellation(tenantSlug);
  const { tenant } = useTenant();

  const handleContactRestaurant = useCallback(() => {
    const phone = tenant?.settings?.contactPhone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast('error', t('Contact information not available'));
    }
  }, [tenant, toast]);

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

  const handleCancelItem = (itemId: string, itemName: string) => {
    cancelItems.mutate(
      { orderId, orderItemIds: [itemId] },
      {
        onSuccess: () => {
          toast('success', `${t('Cancellation requested for')} "${itemName}"`);
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to request cancellation'));
        },
      },
    );
  };

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
          {t('Unable to load order details.')}
        </p>
        <Button variant="secondary" onClick={onBackToMenu}>
          <ArrowLeft className="h-4 w-4" />
          {t('Back to Menu')}
        </Button>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isModifiable = (MODIFIABLE_ORDER_STATUSES as readonly string[]).includes(order.status);

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
          {isCancelled ? t('Order Cancelled') : t('Order Placed!')}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          {isCancelled
            ? t('Your order has been cancelled.')
            : isDelivered
              ? t('Your order has been delivered. Enjoy!')
              : t('Your order is being processed.')}
        </p>
      </div>

      {/* Order info */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-bg-muted">
        <div>
          <p className="text-xs text-text-secondary">{t('Order')}</p>
          <p className="text-sm font-semibold text-text">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">{t('Table')}</p>
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

      {/* Contact restaurant button */}
      {tenant?.settings?.contactPhone && (
        <button
          type="button"
          onClick={handleContactRestaurant}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-bg-elevated hover:bg-bg-muted transition-colors text-text font-medium min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Phone className="h-5 w-5" />
          {t('Contact Restaurant')}
        </button>
      )}

      {/* Status timeline */}
      {!isCancelled && (
        <div className="py-2">
          <StatusTimeline currentStatus={order.status} />
        </div>
      )}

      {/* Add items button — only when order is modifiable */}
      {isModifiable && onAddItems && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => onAddItems(orderId)}
        >
          <Plus className="h-4 w-4" />
          {t('Add Items to Order')}
        </Button>
      )}

      {/* Order items */}
      <div className="rounded-lg border border-border bg-bg-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text">{t('Order Items')}</h3>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => {
            const itemStatus = item.status ?? 'active';
            const isCancelRequested = itemStatus === 'cancel_requested';
            const isItemCancelled = itemStatus === 'cancelled';

            return (
              <div
                key={item.id}
                className={[
                  'px-4 py-3 flex items-center justify-between',
                  isItemCancelled ? 'opacity-50' : '',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-secondary bg-bg-muted rounded px-1.5 py-0.5">
                      x{item.quantity}
                    </span>
                    <span className={[
                      'text-sm truncate',
                      isItemCancelled ? 'text-text-tertiary line-through' : 'text-text',
                    ].join(' ')}>
                      {item.name}
                    </span>
                    {isCancelRequested && (
                      <Badge variant="warning">Cancellation Requested</Badge>
                    )}
                    {isItemCancelled && (
                      <Badge variant="error">Cancelled</Badge>
                    )}
                  </div>
                  {item.modifiersJson && (() => {
                    try {
                      const mods = JSON.parse(item.modifiersJson) as SnapshotModifier[];
                      if (mods.length > 0) {
                        return (
                          <p className="text-xs text-text-tertiary mt-0.5 pl-8 line-clamp-2">
                            {mods.map((m) => m.price > 0 ? `${m.name} (+${formatPrice(m.price)})` : m.name).join(', ')}
                          </p>
                        );
                      }
                    } catch { /* ignore parse errors */ }
                    return null;
                  })()}
                  {isModifiable && itemStatus === 'active' ? (
                    <EditableItemNotes
                      itemId={item.id}
                      orderId={order.id}
                      initialNotes={item.notes}
                      tenantSlug={tenantSlug}
                    />
                  ) : item.notes ? (
                    <p className="text-xs text-text-tertiary mt-0.5 pl-8">
                      {item.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={[
                    'text-sm font-medium whitespace-nowrap',
                    isItemCancelled ? 'text-text-tertiary line-through' : 'text-text',
                  ].join(' ')}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                  {/* Cancel button for active items on modifiable orders */}
                  {isModifiable && itemStatus === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleCancelItem(item.id, item.name)}
                      disabled={cancelItems.isPending}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-danger hover:text-danger/80 hover:bg-danger/10 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                      aria-label={`Request cancellation for ${item.name}`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Total */}
        <div className="px-4 py-3 border-t border-border bg-bg-muted space-y-1">
          {(() => {
            const hasDiscount = order.discountAmount != null && order.discountAmount > 0;
            const hasTax = order.taxAmount != null && order.taxAmount > 0;
            const effectiveTaxLabel = taxLabel || 'Tax';
            const showSubtotal = hasDiscount || (hasTax && !taxInclusive);

            // Compute subtotal before discount (and before exclusive tax)
            const subtotalBeforeDiscount = order.total
              + (order.discountAmount ?? 0)
              + (hasTax && !taxInclusive ? -(order.taxAmount ?? 0) : 0);

            return (
              <>
                {showSubtotal && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Subtotal</span>
                    <span className="text-sm text-text">
                      {formatPrice(subtotalBeforeDiscount)}
                    </span>
                  </div>
                )}
                {hasDiscount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-success">Discount</span>
                    <span className="text-sm text-success">
                      -{formatPrice(order.discountAmount!)}
                    </span>
                  </div>
                )}
                {hasTax && !taxInclusive && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      {effectiveTaxLabel}{taxRate ? ` (${taxRate}%)` : ''}
                    </span>
                    <span className="text-sm text-text">
                      {formatPrice(order.taxAmount!)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text">Total</span>
                  <span className="text-base font-bold text-text">
                    {formatPrice(order.total)}
                  </span>
                </div>
                {hasTax && taxInclusive && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">
                      Includes {effectiveTaxLabel}{taxRate ? ` (${taxRate}%)` : ''}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatPrice(order.taxAmount!)}
                    </span>
                  </div>
                )}
              </>
            );
          })()}
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

      {/* Post-meal feedback — only shown when delivered */}
      {isDelivered && (
        <FeedbackSection
          tenantSlug={tenantSlug}
          orderId={orderId}
          tableNumber={order.tableNumber}
        />
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
