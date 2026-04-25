/**
 * Receipt — themed visual receipt block shown on the customer confirmation screen.
 *
 * This is NOT a print template. It is the styled visual block customers see after
 * placing their order, presenting itemised line items, subtotal, tax, tip, and total
 * in a monospace receipt aesthetic.
 *
 * Theme-awareness: `data-theme` on the root element drives CSS custom property
 * cascade from the active restaurant preset. All colours read from token variables.
 *
 * When tip is omitted (undefined) the tip row is hidden. Pass `showTip={false}` for
 * dine-in flows where tip is collected at the counter.
 */

import { useT } from '@web/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceiptLineItem {
  /** Display name of the menu item. */
  name: string;
  /** Quantity ordered. */
  quantity: number;
  /** Unit price in local currency. */
  unitPrice: number;
}

export interface ReceiptProps {
  /** The data-theme attribute value; drives CSS custom property cascade. */
  theme?: string;
  /** Restaurant display name shown in the header. */
  restaurantName?: string;
  /** Human-readable order reference, e.g. "1042". */
  orderNumber?: string | number;
  /** Table identifier, e.g. "4" or "Bar 2". */
  tableLabel?: string;
  /** ISO 8601 string — formatted to locale date/time for display. */
  placedAt?: string;
  /** Line items to render. */
  items: ReceiptLineItem[];
  /** Tax rate as a decimal, e.g. 0.0875 for 8.75%. Defaults to 0. */
  taxRate?: number;
  /** Tip rate as a decimal, e.g. 0.18 for 18%. Omit to hide the tip row. */
  tipRate?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Receipt({
  theme,
  restaurantName = '',
  orderNumber,
  tableLabel,
  placedAt,
  items,
  taxRate = 0,
  tipRate,
}: ReceiptProps) {
  const t = useT();
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate;
  const tipAmount = tipRate !== undefined ? subtotal * tipRate : 0;
  const total = subtotal + taxAmount + tipAmount;

  const tipLabel = tipRate !== undefined
    ? `${t('Tip')} (${Math.round(tipRate * 100)}%)`
    : '';

  return (
    <div
      data-theme={theme}
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: 24,
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        color: 'var(--color-text)',
        minWidth: 280,
        maxWidth: 340,
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '1px dashed var(--color-border-strong)',
          paddingBottom: 14,
          marginBottom: 14,
        }}
      >
        {restaurantName && (
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--font-display-weight)',
              fontSize: 18,
              letterSpacing: 'var(--font-display-tracking)',
            }}
          >
            {restaurantName}
          </div>
        )}
        {(orderNumber !== undefined || tableLabel) && (
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            {orderNumber !== undefined && `${t('Order')} #${orderNumber}`}
            {orderNumber !== undefined && tableLabel && ' · '}
            {tableLabel && `${t('Table')} ${tableLabel}`}
          </div>
        )}
        {placedAt && (
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            {formatDate(placedAt)}
          </div>
        )}
      </div>

      {/* Line items */}
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-tertiary)', marginRight: 8 }}>
              {item.quantity}×
            </span>
            {item.name}
          </div>
          <div>${formatMoney(item.quantity * item.unitPrice)}</div>
        </div>
      ))}

      {/* Divider */}
      <div
        style={{
          borderTop: '1px dashed var(--color-border-strong)',
          margin: '14px 0 10px',
        }}
      />

      {/* Sub-totals */}
      {[
        [t('Subtotal'), subtotal] as [string, number],
        ...(taxRate > 0 ? [[t('Tax'), taxAmount] as [string, number]] : []),
        ...(tipRate !== undefined ? [[tipLabel, tipAmount] as [string, number]] : []),
      ].map(([label, value]) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: 'var(--color-text-secondary)',
            marginBottom: 4,
          }}
        >
          <div>{label}</div>
          <div>${formatMoney(value)}</div>
        </div>
      ))}

      {/* Total */}
      <div
        style={{
          borderTop: '2px solid var(--color-text)',
          paddingTop: 10,
          marginTop: 10,
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        <div>{t('Total')}</div>
        <div>${formatMoney(total)}</div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px dashed var(--color-border-strong)',
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
          letterSpacing: '0.1em',
        }}
      >
        {t('Thank you · See you soon')}
      </div>
    </div>
  );
}
