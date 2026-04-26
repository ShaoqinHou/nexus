import { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ShoppingBag, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, Printer, CreditCard, HelpCircle, LayoutGrid, Bell, Receipt, Pencil, Tag, Check, Loader2, Trash2, Split, X } from 'lucide-react';
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
import { useT } from '@web/lib/i18n';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useAuth } from '@web/platform/auth/AuthProvider';
import { useToast } from '@web/platform/ToastProvider';
import { useTour } from '@web/platform/TourProvider';
import { useOrders, useUpdateOrderStatus, useHandleCancellationRequest, useUpdatePaymentStatus, useUpdateStaffNotes, useApplyOverride, useAddPayment, useOrderPayments, useRemovePayment } from '../hooks/useOrders';
import { useTableStatuses, useUpdateTableStatus, useWaiterCalls, useAcknowledgeWaiterCall } from '../hooks/useTables';
import type { TableStatusValue } from '../hooks/useTables';
import { staffOnboardingSteps, STAFF_TOUR_ID } from '../tours/staffTour';
import { cleanupStaffTourData } from '../tours/cleanup';
import type { Order } from '../types';
import type { PaymentMethod } from '../types';
import { PAYMENT_METHOD_LABELS } from '../types';
import { OrderReceipt } from './OrderReceipt';

// ---------------------------------------------------------------------------
// Order status flow — derived from shared constants
// ---------------------------------------------------------------------------

function useStatusOptions() {
  const t = useT();
  return useMemo(() => [
    { value: '', label: t('All Statuses') },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: t(ORDER_STATUS_LABELS[s]) })),
  ], [t]);
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

const PAYMENT_STATUS_MAP = {
  unpaid: 'warning' as const,
  paid: 'success' as const,
  refunded: 'error' as const,
};

// ---------------------------------------------------------------------------
// Elapsed time badge helper
// ---------------------------------------------------------------------------

function elapsedMinutes(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
}

function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const t = useT();
  const mins = elapsedMinutes(createdAt);
  const hrs = Math.floor(mins / 60);
  const label = hrs > 0 ? `${hrs}${t('h')} ${mins % 60}${t('m')}` : `${mins}${t('m')}`;

  if (mins >= 15) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-danger bg-danger/10 animate-pulse">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        {label}
      </span>
    );
  }
  if (mins >= 8) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-warning bg-warning/10">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-text-secondary bg-bg-muted">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Table status
// ---------------------------------------------------------------------------

const TABLE_STATUS_LABEL_KEYS: Record<TableStatusValue, string> = {
  free: 'Free',
  occupied: 'Occupied',
  needs_cleaning: 'Needs Cleaning',
};

const TABLE_STATUS_COLOR: Record<TableStatusValue, string> = {
  free: 'bg-success text-text-inverse',
  occupied: 'bg-warning text-text-inverse',
  needs_cleaning: 'bg-danger text-text-inverse',
};

const TABLE_STATUS_CYCLE: Record<TableStatusValue, TableStatusValue> = {
  free: 'occupied',
  occupied: 'needs_cleaning',
  needs_cleaning: 'free',
};

function TableStatusPanel({ tenantSlug }: { tenantSlug: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const tablesQuery = useTableStatuses(tenantSlug);
  const updateTable = useUpdateTableStatus(tenantSlug);
  const tables = tablesQuery.data ?? [];

  const handleCycle = (tableNumber: string, currentStatus: TableStatusValue) => {
    const nextStatus = TABLE_STATUS_CYCLE[currentStatus];
    updateTable.mutate(
      { tableNumber, status: nextStatus },
      {
        onError: () => toast('error', t('Failed to update table status')),
      },
    );
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left min-h-[var(--hit-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-semibold text-text">{t('Table Status')}</span>
            {tables.length > 0 && (
              <span className="text-xs text-text-tertiary">
                ({tables.filter((tbl) => tbl.status === 'free').length} {t('free')},{' '}
                {tables.filter((tbl) => tbl.status === 'occupied').length} {t('occupied')})
              </span>
            )}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          )}
        </CardContent>
      </button>

      {open && (
        <div className="border-t border-border">
          <CardContent className="py-3">
            {tables.length === 0 ? (
              <p className="text-xs text-text-tertiary">
                {t('No tables tracked yet. Click a table chip to add it or update its status.')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tables.map((tbl) => (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => handleCycle(tbl.tableNumber, tbl.status)}
                    disabled={updateTable.isPending}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      TABLE_STATUS_COLOR[tbl.status],
                      updateTable.isPending ? 'opacity-60' : 'hover:opacity-80',
                    ].join(' ')}
                    title={`${t('Table')} ${tbl.tableNumber} — ${t(TABLE_STATUS_LABEL_KEYS[tbl.status])}. ${t('Click to cycle.')}`}
                  >
                    {tbl.tableNumber}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-text-tertiary">
              {t('Click a chip to cycle: Free > Occupied > Needs Cleaning > Free')}
            </p>
          </CardContent>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Waiter call banner
// ---------------------------------------------------------------------------

function WaiterCallBanner({ tenantSlug }: { tenantSlug: string }) {
  const t = useT();
  const { toast } = useToast();
  const callsQuery = useWaiterCalls(tenantSlug);
  const acknowledge = useAcknowledgeWaiterCall(tenantSlug);
  const calls = callsQuery.data ?? [];

  if (calls.length === 0) return null;

  const handleAck = (callId: string, tableNumber: string) => {
    acknowledge.mutate(callId, {
      onSuccess: () => toast('success', `${t('Table')} ${tableNumber} ${t('acknowledged')}`),
      onError: () => toast('error', t('Failed to acknowledge call')),
    });
  };

  const billCalls = calls.filter((c) => c.callType === 'bill');
  const assistCalls = calls.filter((c) => c.callType !== 'bill');

  return (
    <div className="space-y-2">
      {billCalls.length > 0 && (
        <div className="rounded-lg border border-success bg-success-light p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-success shrink-0" />
            <span className="text-sm font-semibold text-success">
              {billCalls.length} {t(billCalls.length !== 1 ? 'bill requests' : 'bill request')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {billCalls.map((call) => (
              <Button
                key={call.id}
                size="sm"
                variant="secondary"
                onClick={() => handleAck(call.id, call.tableNumber)}
                loading={acknowledge.isPending && acknowledge.variables === call.id}
                className="min-h-[var(--hit-sm)] border-success/30"
              >
                {t('Table')} {call.tableNumber} — {t('Bill Ready')}
              </Button>
            ))}
          </div>
        </div>
      )}
      {assistCalls.length > 0 && (
        <div className="rounded-lg border border-warning bg-warning-light p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-warning shrink-0" />
            <span className="text-sm font-semibold text-warning">
              {assistCalls.length} {t(assistCalls.length !== 1 ? 'waiter calls' : 'waiter call')} {t('pending')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {assistCalls.map((call) => (
              <Button
                key={call.id}
                size="sm"
                variant="secondary"
                onClick={() => handleAck(call.id, call.tableNumber)}
                loading={acknowledge.isPending && acknowledge.variables === call.id}
                className="min-h-[var(--hit-sm)]"
              >
                {t('Table')} {call.tableNumber} — {t('Acknowledge')}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print receipt helper
// ---------------------------------------------------------------------------

function printReceipt(order: Order, tenantName: string, t?: (key: string) => string) {
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) return;

  const receiptHtml = OrderReceipt.toHtml(order, tenantName, t);
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// ---------------------------------------------------------------------------
// Payment method dropdown
// ---------------------------------------------------------------------------

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'qr_pay', 'voucher', 'complimentary'];

function PaymentMethodSelect({
  order,
  onSelect,
  isPending,
}: {
  order: Order;
  onSelect: (orderId: string, paymentStatus: PaymentStatus, paymentMethod: PaymentMethod) => void;
  isPending: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <Button
        size="sm"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        loading={isPending}
        className="min-h-[var(--hit-sm)]"
      >
        <CreditCard className="h-3.5 w-3.5 mr-1" />
        {t('Mark Paid')}
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-bg-surface border border-border rounded shadow-lg p-1 min-w-[140px]">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              className={[
                'w-full text-left text-sm px-3 py-2 rounded transition-colors',
                method === 'complimentary'
                  ? 'text-text-tertiary hover:bg-bg-muted italic'
                  : 'text-text hover:bg-bg-muted',
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(order.id, 'paid', method);
                setOpen(false);
              }}
              disabled={isPending}
            >
              {t(PAYMENT_METHOD_LABELS[method])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff notes inline editor
// ---------------------------------------------------------------------------

function StaffNotesEditor({
  order,
  onSave,
  isSaving,
}: {
  order: Order;
  onSave: (orderId: string, staffNotes: string) => void;
  isSaving: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(order.staffNotes ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = value.trim();
    onSave(order.id, trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setValue(order.staffNotes ?? '');
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <label className="text-xs font-medium text-text-secondary">{t('Staff Notes:')}</label>
        <div className="flex items-start gap-1.5 mt-0.5">
          <textarea
            ref={textareaRef}
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 text-xs italic bg-primary/5 border border-primary/20 rounded-md p-2 text-text resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={t('Add internal notes...')}
          />
          {isSaving && <Loader2 className="h-3.5 w-3.5 text-text-tertiary animate-spin mt-1" />}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-1.5">
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-text-secondary">{t('Staff Notes:')} </span>
        {order.staffNotes ? (
          <span className="text-xs italic text-text bg-primary/5 rounded px-1 py-0.5">{order.staffNotes}</span>
        ) : (
          <span className="text-xs text-text-tertiary italic">{t('None')}</span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setValue(order.staffNotes ?? '');
          setEditing(true);
        }}
        className="shrink-0 p-1 rounded hover:bg-bg-muted text-text-tertiary hover:text-text transition-colors"
        title={t('Edit staff notes')}
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price override popover (owner/manager only)
// ---------------------------------------------------------------------------

function DiscountOverridePopover({
  order,
  onApply,
  isPending,
}: {
  order: Order;
  onApply: (orderId: string, amount: number, reason: string) => void;
  isPending: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !reason.trim()) return;
    onApply(order.id, numAmount, reason.trim());
    setOpen(false);
    setAmount('');
    setReason('');
  };

  return (
    <div ref={ref} className="relative inline-block">
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="min-h-[var(--hit-sm)]"
      >
        <Tag className="h-3.5 w-3.5 mr-1" />
        {t('Discount')}
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-20 bg-bg-surface border border-border rounded shadow-lg p-3 min-w-[220px]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-text mb-2">{t('Apply Discount')}</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary">{t('Amount ($)')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mt-0.5 text-sm border border-border rounded-md px-2 py-1.5 bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="5.00"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">{t('Reason (required)')}</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full mt-0.5 text-sm border border-border rounded-md px-2 py-1.5 bg-bg text-text resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('Birthday comp...')}
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmit}
              loading={isPending}
              disabled={!amount || parseFloat(amount) <= 0 || !reason.trim()}
              className="w-full min-h-[36px]"
            >
              {t('Apply')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Split Payment panel
// ---------------------------------------------------------------------------

function SplitPaymentPanel({
  order,
  tenantSlug,
  userRole,
}: {
  order: Order;
  tenantSlug: string;
  userRole: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paidBy, setPaidBy] = useState('');
  const { toast } = useToast();

  const paymentsQuery = useOrderPayments(tenantSlug, open ? order.id : '');
  const addPaymentMutation = useAddPayment(tenantSlug);
  const removePaymentMutation = useRemovePayment(tenantSlug);

  const payments = paymentsQuery.data ?? [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const roundedTotalPaid = Math.round(totalPaid * 100) / 100;
  const remaining = Math.max(0, Math.round((order.total - roundedTotalPaid) * 100) / 100);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    addPaymentMutation.mutate(
      { orderId: order.id, amount: numAmount, method, paidBy: paidBy.trim() || undefined },
      {
        onSuccess: () => {
          toast('success', `${t('Payment of')} ${formatPrice(numAmount)} ${t('recorded')}`);
          setAmount('');
          setPaidBy('');
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to add payment'));
        },
      },
    );
  };

  const handleRemove = (paymentId: string) => {
    removePaymentMutation.mutate(
      { orderId: order.id, paymentId },
      {
        onSuccess: () => {
          toast('success', t('Payment removed'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to remove payment'));
        },
      },
    );
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
          setAmount(String(remaining > 0 ? remaining.toFixed(2) : order.total.toFixed(2)));
        }}
        className="min-h-[var(--hit-sm)]"
      >
        <Split className="h-3.5 w-3.5 mr-1" />
        {t('Split Payment')}
      </Button>
    );
  }

  return (
    <div
      className="mt-3 rounded-lg border border-border bg-bg-surface p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-text">{t('Split Payment')}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded hover:bg-bg-muted text-text-tertiary hover:text-text transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Existing payments */}
      {payments.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs bg-bg-muted rounded-md px-2 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-text font-mono tabular-nums">{formatPrice(p.amount)}</span>
                <span className="text-text-secondary">{t(PAYMENT_METHOD_LABELS[p.method])}</span>
                {p.paidBy && <span className="text-text-tertiary truncate">({p.paidBy})</span>}
              </div>
              {(userRole === 'owner' || userRole === 'manager') && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  disabled={removePaymentMutation.isPending}
                  className="shrink-0 p-1 rounded hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors"
                  title={t('Remove payment')}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
            <span className="text-text-secondary">
              {t('Paid')}: <span className="font-semibold text-text font-mono tabular-nums">{formatPrice(roundedTotalPaid)}</span> / <span className="font-mono tabular-nums">{formatPrice(order.total)}</span>
            </span>
            {remaining > 0 && (
              <span className="text-warning font-semibold font-mono tabular-nums">
                {t('Remaining')}: {formatPrice(remaining)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add payment form */}
      {remaining > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-text-secondary">{t('Amount ($)')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mt-0.5 text-sm border border-border rounded-md px-2 py-1.5 bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={remaining.toFixed(2)}
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">{t('Method')}</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full mt-0.5 text-sm border border-border rounded-md px-2 py-1.5 bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{t(PAYMENT_METHOD_LABELS[m])}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary">{t('Paid by')}</label>
              <input
                type="text"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full mt-0.5 text-sm border border-border rounded-md px-2 py-1.5 bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('Person 1')}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            loading={addPaymentMutation.isPending}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full min-h-[36px]"
          >
            {t('Add Payment')}
          </Button>
        </div>
      )}

      {remaining <= 0 && payments.length > 0 && (
        <div className="text-center">
          <Badge variant="success">
            <Check className="h-3 w-3 mr-1" />
            {t('Fully Paid')}
          </Badge>
        </div>
      )}
    </div>
  );
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
  onUpdateStaffNotes,
  isStaffNotesSaving,
  onApplyOverride,
  isOverridePending,
  userRole,
  tenantName,
  tenantSlug,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  isUpdating: boolean;
  onHandleCancellation: (orderId: string, itemId: string, action: 'approve' | 'reject') => void;
  isCancellationPending: boolean;
  onUpdatePaymentStatus: (id: string, paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) => void;
  isPaymentUpdating: boolean;
  onUpdateStaffNotes: (orderId: string, staffNotes: string) => void;
  isStaffNotesSaving: boolean;
  onApplyOverride: (orderId: string, amount: number, reason: string) => void;
  isOverridePending: boolean;
  userRole: string;
  tenantName: string;
  tenantSlug: string;
}) {
  const t = useT();
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
        className="w-full text-left min-h-[var(--hit-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <CardContent className="flex items-center justify-between gap-3 sm:gap-4 py-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="shrink-0 h-10 w-10 rounded-full bg-bg-muted flex items-center justify-center">
              <span className="text-sm font-bold text-text font-mono">
                {order.tableNumber}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">
                {t('Table')} <span className="font-mono">{order.tableNumber}</span>
              </p>
              <p className="text-xs text-text-secondary">
                {order.items.length} {t(order.items.length !== 1 ? 'items' : 'item')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {cancelRequestCount > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {cancelRequestCount} {t('cancel req')}
              </Badge>
            )}
            <div className="text-right">
              <p className="text-sm font-semibold text-text font-mono tabular-nums">
                {formatPrice(order.total)}
              </p>
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <Clock className="h-3 w-3" />
                {timeAgo(order.createdAt, t)}
              </div>
            </div>
            <ElapsedBadge createdAt={order.createdAt} />
            <StatusBadge status={order.status} statusMap={ORDER_STATUS_MAP} />
            {(order.paymentStatus ?? 'unpaid') === 'paid' && order.paymentMethod ? (
              <Badge variant="success">
                {t('Paid')} &middot; {t(PAYMENT_METHOD_LABELS[order.paymentMethod])}
              </Badge>
            ) : (
              <StatusBadge
                status={order.paymentStatus ?? 'unpaid'}
                statusMap={PAYMENT_STATUS_MAP}
              />
            )}
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
            <table className="w-full text-sm min-w-[500px]">
              <thead className="sticky top-0 bg-bg-surface">
                <tr className="text-left text-text-secondary border-b-2 border-border">
                  <th className="pb-2 pr-4 font-medium">{t('Item')}</th>
                  <th className="pb-2 px-2 font-medium text-center">{t('Qty')}</th>
                  <th className="pb-2 px-4 font-medium text-right">{t('Price')}</th>
                  <th className="pb-2 pl-4 font-medium text-right">{t('Status')}</th>
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
                      <td className="py-3 pr-4 text-text">
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
                              className="min-h-[var(--hit-sm)]"
                            >
                              {t('Accept Cancel')}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onHandleCancellation(order.id, item.id, 'reject');
                              }}
                              disabled={isCancellationPending}
                              className="min-h-[var(--hit-sm)]"
                            >
                              {t('Reject')}
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center text-text-secondary font-mono tabular-nums">
                        {item.quantity}
                      </td>
                      <td className={[
                        'py-3 px-4 text-right font-mono tabular-nums',
                        isItemCancelled ? 'text-text-tertiary line-through' : 'text-text',
                      ].join(' ')}>
                        {formatPrice(item.price * item.quantity)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        {isCancelRequested && (
                          <Badge variant="warning">{t('Cancel Requested')}</Badge>
                        )}
                        {isItemCancelled && (
                          <Badge variant="error">{t('Cancelled')}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="pt-2 font-semibold text-text" colSpan={3}>
                    {t('Total')}
                  </td>
                  <td className="pt-2 text-right font-semibold text-text font-mono tabular-nums">
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

            {/* Staff notes editor */}
            <StaffNotesEditor
              order={order}
              onSave={onUpdateStaffNotes}
              isSaving={isStaffNotesSaving}
            />

            {/* Discount override display */}
            {order.discountOverride != null && order.discountOverride > 0 && (
              <div className="mt-2 text-xs bg-warning/10 border border-warning/20 rounded-md p-2">
                <span className="font-semibold text-warning">Discount: -{formatPrice(order.discountOverride)}</span>
                {order.overrideReason && (
                  <span className="text-text-secondary ml-1.5">({order.overrideReason})</span>
                )}
              </div>
            )}

            {/* Paid/Refunded guard badges */}
            {(order.paymentStatus ?? 'unpaid') === 'paid' && (
              <div className="mt-3">
                <Badge variant="success">
                  <Check className="h-3 w-3 mr-1" />
                  {t('Paid')} &mdash; {t('Locked')}
                  {order.paymentMethod ? ` (${t(PAYMENT_METHOD_LABELS[order.paymentMethod])})` : ''}
                </Badge>
              </div>
            )}
            {(order.paymentStatus ?? 'unpaid') === 'refunded' && (
              <div className="mt-3">
                <Badge variant="error">{t('Refunded')}</Badge>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {(order.paymentStatus ?? 'unpaid') === 'refunded' ? (
                // Refunded — all actions disabled
                <span className="text-xs text-text-tertiary italic">{t('All actions disabled (order refunded)')}</span>
              ) : (
                <>
                  {nextStatus && nextLabel && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(order.id, nextStatus);
                      }}
                      loading={isUpdating}
                      disabled={(order.paymentStatus ?? 'unpaid') === 'paid'}
                      title={(order.paymentStatus ?? 'unpaid') === 'paid' ? 'Order is paid. Contact a manager to modify.' : undefined}
                      className="min-h-[var(--hit-sm)]"
                    >
                      {t(nextLabel)}
                    </Button>
                  )}

                  {/* Payment status: dropdown for unpaid, locked badge for paid */}
                  {(order.paymentStatus ?? 'unpaid') !== 'paid' && order.status !== 'cancelled' && (
                    <>
                      <PaymentMethodSelect
                        order={order}
                        onSelect={onUpdatePaymentStatus}
                        isPending={isPaymentUpdating}
                      />
                      {order.total > 0 && order.status === 'delivered' && (
                        <SplitPaymentPanel
                          order={order}
                          tenantSlug={tenantSlug}
                          userRole={userRole}
                        />
                      )}
                    </>
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
                      className="min-h-[var(--hit-sm)]"
                    >
                      {t('Refund')}
                    </Button>
                  )}

                  {/* Print receipt */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      printReceipt(order, tenantName, t);
                    }}
                    className="min-h-[var(--hit-sm)]"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    {t('Print')}
                  </Button>

                  {/* Discount override — owner/manager only */}
                  {(userRole === 'owner' || userRole === 'manager') && (order.paymentStatus ?? 'unpaid') !== 'paid' && (
                    <DiscountOverridePopover
                      order={order}
                      onApply={onApplyOverride}
                      isPending={isOverridePending}
                    />
                  )}

                  {order.status !== 'cancelled' && order.status !== 'delivered' && (order.paymentStatus ?? 'unpaid') !== 'paid' && (
                    <ConfirmButton
                      variant="destructive"
                      size="sm"
                      onConfirm={() => onUpdateStatus(order.id, 'cancelled')}
                      confirmText={t('Cancel this order?')}
                      disabled={isUpdating}
                      className="min-h-[var(--hit-sm)]"
                    >
                      {t('Cancel Order')}
                    </ConfirmButton>
                  )}
                </>
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
  const t = useT();
  const statusOptions = useStatusOptions();
  const { tenantSlug, tenant } = useTenant();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter) f.status = statusFilter;
    if (tableFilter) f.tableNumber = tableFilter;
    return f;
  }, [statusFilter, tableFilter]);

  // Reset to page 1 when filters change
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };
  const handleTableFilter = (value: string) => {
    setTableFilter(value);
    setPage(1);
  };

  const ordersQuery = useOrders(tenantSlug, filters, page);
  const ordersPage = ordersQuery.data;
  const orders = ordersPage?.data ?? [];
  const totalOrders = ordersPage?.total ?? 0;
  const pageLimit = ordersPage?.limit ?? 50;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageLimit));

  const { toast } = useToast();
  const { startTour } = useTour();
  const updateStatus = useUpdateOrderStatus(tenantSlug);
  const handleCancellation = useHandleCancellationRequest(tenantSlug);
  const updatePayment = useUpdatePaymentStatus(tenantSlug);
  const updateStaffNotes = useUpdateStaffNotes(tenantSlug);
  const applyOverride = useApplyOverride(tenantSlug);

  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          toast('success', `${t('Order status updated to')} ${status}`);
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update order status'));
        },
      },
    );
  };

  const handleUpdatePaymentStatus = (id: string, paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) => {
    updatePayment.mutate(
      { id, paymentStatus, paymentMethod },
      {
        onSuccess: () => {
          const methodLabel = paymentMethod ? ` (${t(PAYMENT_METHOD_LABELS[paymentMethod])})` : '';
          toast('success', `${t('Payment marked as')} ${t(PAYMENT_STATUS_LABELS[paymentStatus])}${methodLabel}`);
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update payment status'));
        },
      },
    );
  };

  const handleCancellationRequest = (orderId: string, itemId: string, action: 'approve' | 'reject') => {
    handleCancellation.mutate(
      { orderId, itemId, action },
      {
        onSuccess: () => {
          toast('success', action === 'approve' ? t('Item cancelled') : t('Cancellation rejected'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to handle cancellation'));
        },
      },
    );
  };

  const handleUpdateStaffNotes = (orderId: string, staffNotes: string) => {
    updateStaffNotes.mutate(
      { orderId, staffNotes },
      {
        onSuccess: () => {
          toast('success', t('Staff notes updated'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update staff notes'));
        },
      },
    );
  };

  const handleApplyOverride = (orderId: string, amount: number, reason: string) => {
    applyOverride.mutate(
      { orderId, amount, reason },
      {
        onSuccess: () => {
          toast('success', `${t('Discount of')} ${formatPrice(amount)} ${t('applied')}`);
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to apply discount'));
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{t('Orders')}</h1>
        <p className="text-xs text-text-tertiary">
          {t('Auto-refreshes every 10s')}
        </p>
      </div>

      {/* Waiter call banner — only visible when calls are pending */}
      <WaiterCallBanner tenantSlug={tenantSlug} />

      {/* Table status panel */}
      <TableStatusPanel tenantSlug={tenantSlug} />

      {/* Filter bar */}
      <Card data-tour="order-filters">
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={handleStatusFilter}
              label={t('Status')}
            />
          </div>
          <div className="w-full sm:w-48">
            <Input
              label={t('Table Number')}
              value={tableFilter}
              onChange={(e) => handleTableFilter(e.target.value)}
              placeholder={t('e.g. 5')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order list */}
      {ordersQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-secondary">{t('Loading orders...')}</p>
        </div>
      ) : orders.length === 0 ? (
        <>
          <EmptyState
            icon={ShoppingBag}
            title={t('No orders')}
            description={
              statusFilter || tableFilter
                ? t('No orders match your filters. Try adjusting them.')
                : t('No orders yet. Orders will appear here when customers place them.')
            }
          />
          {/* Onboarding checklist for new restaurants (no orders, no filters) */}
          {!statusFilter && !tableFilter && (
            <div className="space-y-4 mt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-text">{t('Welcome to your restaurant!')}</h2>
                  <p className="text-sm text-text-secondary mt-1">{t("Let's get you set up. Follow these steps:")}</p>
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
                  {t('Take a Guided Tour')}
                </Button>
              </div>
              <div className="space-y-3">
                <OnboardingStep
                  number={1}
                  title={t('Set up your menu')}
                  description={t('Add categories and items for customers to browse')}
                  link={`/t/${tenantSlug}/ordering/menu`}
                />
                <OnboardingStep
                  number={2}
                  title={t('Configure modifiers')}
                  description={t('Add sizes, toppings, and other customizations')}
                  link={`/t/${tenantSlug}/ordering/modifiers`}
                />
                <OnboardingStep
                  number={3}
                  title={t('Customize your theme')}
                  description={t('Set your brand colors, logo, and operating hours')}
                  link={`/t/${tenantSlug}/ordering/settings`}
                />
                <OnboardingStep
                  number={4}
                  title={t('Generate QR codes')}
                  description={t('Print codes for your tables so customers can order')}
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
              onUpdateStaffNotes={handleUpdateStaffNotes}
              isStaffNotesSaving={
                updateStaffNotes.isPending &&
                updateStaffNotes.variables?.orderId === order.id
              }
              onApplyOverride={handleApplyOverride}
              isOverridePending={
                applyOverride.isPending &&
                applyOverride.variables?.orderId === order.id
              }
              userRole={user?.role ?? 'staff'}
              tenantName={tenant?.name ?? 'Restaurant'}
              tenantSlug={tenantSlug}
            />
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t('Previous')}
              </Button>
              <span className="text-sm text-text-secondary">
                {t('Page')} {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t('Next')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
