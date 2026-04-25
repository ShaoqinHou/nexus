/**
 * CheckoutSummary — themed cart/order summary block with a place-order CTA.
 *
 * Renders itemised cart contents, a divider, per-line cost breakdown (subtotal,
 * delivery, tax), a bold total, and a full-width place-order button that mirrors
 * the total amount in its label.
 *
 * Theme-awareness: `data-theme` on the root element propagates the active
 * restaurant preset's CSS custom properties throughout the component. All colour
 * references use `var(--color-*)` tokens — no hardcoded values.
 *
 * Precomputed-total bridge: pass `precomputedTotal` (and optionally
 * `precomputedSubtotal`, `discountAmount`, `discountLabel`, `taxLabel`) to
 * override local computation. This is used by CartSheet which already has
 * finalTotal / discountAmount from `useCartOrder` (promos, etc.).
 *
 * Typical usage: cart sheet confirmation step, checkout page sidebar.
 */

import { formatPrice } from '@web/lib/format';
import { useT } from '@web/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckoutLineItem {
  /** Display label, e.g. "Mapo Tofu" or "Steamed Rice ×2". */
  name: string;
  /** Quantity. */
  quantity: number;
  /** Unit price in local currency. */
  unitPrice: number;
}

export interface CheckoutSummaryProps {
  /** The data-theme attribute value; drives CSS custom property cascade. */
  theme?: string;
  /** Line items to summarise. */
  items: CheckoutLineItem[];
  /** Flat delivery fee in local currency. Pass 0 or omit to hide the delivery row. */
  deliveryFee?: number;
  /** Tax rate as a decimal, e.g. 0.0875. Pass 0 or omit to hide the tax row. */
  taxRate?: number;
  /**
   * Override the computed total with a pre-calculated value (e.g. from
   * `useCartOrder`'s `finalTotal` which accounts for promos). When provided,
   * local subtotal + tax + delivery computation is bypassed for the total line.
   */
  precomputedTotal?: number;
  /**
   * Override the displayed subtotal. When provided alongside `precomputedTotal`,
   * the subtotal row shows this value instead of the locally-computed one.
   */
  precomputedSubtotal?: number;
  /** Discount amount to display (e.g. promo savings). Only shown when > 0. */
  discountAmount?: number;
  /** Label for the discount row. Defaults to "Discount". */
  discountLabel?: string;
  /** Label for the tax row / footnote. Defaults to "Tax". */
  taxLabel?: string;
  /**
   * When true, tax is shown as a footnote "(Includes X% Tax)" below the Total
   * row instead of a separate tax row, reflecting tax-included pricing (NZ/AU GST).
   * When false or omitted, the tax row is shown separately (default behaviour).
   */
  taxInclusive?: boolean;
  /** Called when the user clicks the place-order button. */
  onPlaceOrder?: () => void;
  /** Loading state — disables and dims the CTA button when true. */
  loading?: boolean;
  /** Override for the place-order button label. Defaults to "Place order · $X.XX". */
  ctaLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CheckoutSummary({
  theme,
  items,
  deliveryFee = 0,
  taxRate = 0,
  precomputedTotal,
  precomputedSubtotal,
  discountAmount = 0,
  discountLabel,
  taxLabel,
  taxInclusive = false,
  onPlaceOrder,
  loading = false,
  ctaLabel,
}: CheckoutSummaryProps) {
  const t = useT();

  const localSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const subtotal = precomputedSubtotal ?? localSubtotal;
  const taxAmount = subtotal * taxRate;
  const localTotal = subtotal + deliveryFee + taxAmount;
  const total = precomputedTotal ?? localTotal;

  const resolvedDiscountLabel = discountLabel ?? t('Discount');
  const resolvedTaxLabel = taxLabel ?? t('Tax');

  const buttonLabel = ctaLabel ?? `${t('Place order')} · ${formatPrice(total)}`;

  return (
    <div
      data-theme={theme}
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: 20,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        minWidth: 300,
      }}
    >
      {/* Heading */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--font-display-weight)',
          fontSize: 17,
          marginBottom: 14,
        }}
      >
        {t('Order summary')}
      </div>

      {/* Line items */}
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          <div style={{ color: 'var(--color-text-secondary)' }}>
            {item.quantity}× {item.name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>
            {formatPrice(item.quantity * item.unitPrice)}
          </div>
        </div>
      ))}

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'var(--color-border)',
          margin: '14px 0',
        }}
      />

      {/* Cost breakdown */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          marginBottom: 4,
        }}
      >
        <div>{t('Subtotal')}</div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>{formatPrice(subtotal)}</div>
      </div>

      {deliveryFee > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginBottom: 4,
          }}
        >
          <div>{t('Delivery')}</div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>{formatPrice(deliveryFee)}</div>
        </div>
      )}

      {discountAmount > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--color-success)',
            marginBottom: 4,
          }}
        >
          <div>{resolvedDiscountLabel}</div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>-{formatPrice(discountAmount)}</div>
        </div>
      )}

      {taxRate > 0 && !taxInclusive && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginBottom: 14,
          }}
        >
          <div>{resolvedTaxLabel}</div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>{formatPrice(taxAmount)}</div>
        </div>
      )}

      {/* Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 16,
          fontWeight: 700,
          marginBottom: taxInclusive && taxRate > 0 ? 4 : 18,
          marginTop: (taxRate > 0 && !taxInclusive) || deliveryFee > 0 || discountAmount > 0 ? 0 : 14,
        }}
      >
        <div>{t('Total')}</div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>{formatPrice(total)}</div>
      </div>

      {/* Tax-inclusive footnote */}
      {taxInclusive && taxRate > 0 && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            textAlign: 'right',
            marginBottom: 14,
          }}
        >
          ({t('Includes')} {Math.round(taxRate * 100)}% {resolvedTaxLabel})
        </div>
      )}

      {/* Place order CTA */}
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={loading || !onPlaceOrder}
        style={{
          width: '100%',
          height: 52,
          background: loading ? 'var(--color-bg-muted)' : 'var(--color-primary)',
          color: loading ? 'var(--color-text-secondary)' : 'var(--color-text-inverse)',
          border: 'none',
          borderRadius: 'var(--radius-btn)',
          fontWeight: 600,
          fontSize: 15,
          cursor: loading || !onPlaceOrder ? 'not-allowed' : 'pointer',
          transition: 'opacity 150ms',
          opacity: loading ? 0.6 : 1,
          fontFamily: 'var(--font-sans)',
        }}
        aria-busy={loading}
      >
        {loading ? t('Placing order…') : buttonLabel}
      </button>
    </div>
  );
}
