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
 *
 * When `itemRenderer` is provided it replaces the default mono-line per-item layout,
 * allowing callers to embed cancel buttons, EditableItemNotes, status badges, etc.
 *
 * When `taxInclusive` is true the tax is shown as a footnote "(includes X% tax)"
 * rather than a separate row, reflecting the tax-included pricing model.
 */

import type { ReactNode } from 'react';
import { useT } from '@web/lib/i18n';
import { formatPrice } from '@web/lib/format';

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
  /**
   * Flat discount amount to deduct from subtotal (already computed).
   * When provided a discount row is rendered between subtotal and tax.
   */
  discountAmount?: number;
  /** Label for the discount row. Defaults to 'Discount'. */
  discountLabel?: string;
  /**
   * When true, tax is shown as a footnote "(includes X% tax)" after the Total
   * row instead of a separate subtotal row. Use for NZ/AU GST-inclusive pricing.
   */
  taxInclusive?: boolean;
  /** Label for the tax row / footnote. Defaults to 'Tax'. */
  taxLabel?: string;
  /**
   * Custom line-item renderer. When provided, this function is called for each
   * item instead of the default mono-line layout. Allows callers to embed
   * cancel buttons, EditableItemNotes, status badges, etc.
   *
   * @param item  The ReceiptLineItem data for this row.
   * @param index The index of this item in the `items` array.
   * @returns A ReactNode to render for this item row.
   */
  itemRenderer?: (item: ReceiptLineItem, index: number) => ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  discountAmount,
  discountLabel,
  taxInclusive = false,
  taxLabel,
  itemRenderer,
}: ReceiptProps) {
  const t = useT();

  const effectiveDiscountLabel = discountLabel ?? t('Discount');
  const effectiveTaxLabel = taxLabel ?? t('Tax');

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = discountAmount != null && discountAmount > 0 ? discountAmount : 0;
  const subtotalAfterDiscount = subtotal - discount;
  // When tax-inclusive, taxAmount is already baked into the subtotal — don't add it again.
  const taxAmount = taxInclusive ? subtotal * taxRate : subtotalAfterDiscount * taxRate;
  const tipAmount = tipRate !== undefined ? subtotalAfterDiscount * tipRate : 0;
  const total = taxInclusive
    ? subtotalAfterDiscount + tipAmount
    : subtotalAfterDiscount + taxAmount + tipAmount;

  const tipRowLabel = tipRate !== undefined
    ? `${t('Tip')} (${Math.round(tipRate * 100)}%)`
    : '';

  // Build the subtotal rows array (between divider and Total)
  const showSubtotal = discount > 0 || (!taxInclusive && taxRate > 0) || tipRate !== undefined;
  const subRows: Array<{ label: string; value: number; color?: string }> = [];

  if (showSubtotal) {
    subRows.push({ label: t('Subtotal'), value: subtotal });
  }
  if (discount > 0) {
    subRows.push({ label: effectiveDiscountLabel, value: -discount, color: 'var(--color-success)' });
  }
  if (!taxInclusive && taxRate > 0) {
    const taxRatePct = Math.round(taxRate * 100);
    subRows.push({
      label: `${effectiveTaxLabel} (${taxRatePct}%)`,
      value: taxAmount,
    });
  }
  if (tipRate !== undefined) {
    subRows.push({ label: tipRowLabel, value: tipAmount });
  }

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
      {items.map((item, idx) =>
        itemRenderer ? (
          itemRenderer(item, idx)
        ) : (
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
            <div>{formatPrice(item.quantity * item.unitPrice)}</div>
          </div>
        )
      )}

      {/* Divider */}
      <div
        style={{
          borderTop: '1px dashed var(--color-border-strong)',
          margin: '14px 0 10px',
        }}
      />

      {/* Sub-total rows */}
      {subRows.map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: color ?? 'var(--color-text-secondary)',
            marginBottom: 4,
          }}
        >
          <div>{label}</div>
          <div>
            {value < 0
              ? `-${formatPrice(Math.abs(value))}`
              : formatPrice(value)}
          </div>
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
        <div>{formatPrice(total)}</div>
      </div>

      {/* Tax-inclusive footnote */}
      {taxInclusive && taxRate > 0 && (
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            textAlign: 'right',
          }}
        >
          ({t('includes')} {Math.round(taxRate * 100)}% {effectiveTaxLabel})
        </div>
      )}

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
