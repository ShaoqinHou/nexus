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
 * This is a NEW DISPLAY-ONLY component for future integration. It does not wire
 * mutations directly. Pass an `onPlaceOrder` callback to handle the button click.
 *
 * Typical usage: cart sheet confirmation step, checkout page sidebar.
 */

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
  /** Called when the user clicks the place-order button. */
  onPlaceOrder?: () => void;
  /** Loading state — disables and dims the CTA button when true. */
  loading?: boolean;
  /** Override for the place-order button label. Defaults to "Place order · $X.XX". */
  ctaLabel?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(value: number): string {
  return value.toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CheckoutSummary({
  theme,
  items,
  deliveryFee = 0,
  taxRate = 0,
  onPlaceOrder,
  loading = false,
  ctaLabel,
}: CheckoutSummaryProps) {
  const t = useT();
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + deliveryFee + taxAmount;

  const buttonLabel = ctaLabel ?? `${t('Place order')} · $${formatMoney(total)}`;

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
            ${formatMoney(item.quantity * item.unitPrice)}
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
        <div style={{ fontFamily: 'var(--font-mono)' }}>${formatMoney(subtotal)}</div>
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
          <div style={{ fontFamily: 'var(--font-mono)' }}>${formatMoney(deliveryFee)}</div>
        </div>
      )}

      {taxRate > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginBottom: 14,
          }}
        >
          <div>{t('Tax')}</div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>${formatMoney(taxAmount)}</div>
        </div>
      )}

      {/* Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 18,
          marginTop: taxRate > 0 || deliveryFee > 0 ? 0 : 14,
        }}
      >
        <div>{t('Total')}</div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>${formatMoney(total)}</div>
      </div>

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
