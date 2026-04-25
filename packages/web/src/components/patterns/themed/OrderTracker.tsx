/**
 * OrderTracker — themed order status timeline visualization.
 *
 * Shows a horizontal step-by-step tracker from order placement through delivery
 * or service completion. Renders in two modes:
 *   - "dine-in"  → Received → Preparing → Ready → Served
 *   - "delivery" → Received → Preparing → On the way → Delivered
 *
 * Theme-awareness: the wrapper element carries `data-theme={theme}` so CSS
 * custom properties cascade from the active theme preset automatically.
 * Never hardcode colors here — every visual value reads from `var(--color-*)`.
 *
 * Responsive layout: at ≤640px (sm breakpoint) the steps stack vertically
 * with a vertical connector line on the left edge, keeping labels readable
 * at 375px viewport width. Above 640px the original horizontal layout is used.
 *
 * Typical usage: customer confirmation page, kitchen display status header.
 */

import { useT } from '@web/lib/i18n';

/* ---------------------------------------------------------------------------
 * Responsive styles — small `<style>` block is consistent with other themed
 * components that rely on inline-style props for the data-theme cascade.
 * Media queries cannot be expressed as Tailwind utilities on dynamic elements,
 * so a scoped block is the cleanest option here.
 * --------------------------------------------------------------------------- */
const RESPONSIVE_STYLES = `
.order-tracker-steps {
  display: flex;
  flex-direction: row;
  gap: 0;
  position: relative;
}
.order-tracker-step {
  flex: 1;
  text-align: center;
  position: relative;
}
.order-tracker-connector {
  position: absolute;
  top: 13px;
  left: 50%;
  right: -50%;
  height: 2px;
  z-index: 0;
}
.order-tracker-step-label {
  font-size: 11px;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .order-tracker-steps {
    flex-direction: column;
    gap: 0;
  }
  .order-tracker-step {
    flex: none;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 8px 0;
    padding-left: 4px;
    position: relative;
  }
  /* Vertical connector: a thin line on the left, between bubbles */
  .order-tracker-connector {
    position: absolute;
    /* Start at the bottom of this bubble's centre */
    top: 36px;
    left: 17px;
    right: auto;
    width: 2px;
    height: calc(100% + 16px);
  }
  .order-tracker-step-label {
    font-size: 12px;
    margin-top: 0;
  }
}
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderType = 'dine-in' | 'delivery';

/** Status IDs for dine-in orders. */
export type DineInStatus = 'received' | 'preparing' | 'ready' | 'served';

/** Status IDs for delivery orders. */
export type DeliveryStatus = 'received' | 'preparing' | 'on-way' | 'delivered';

export type OrderStatus = DineInStatus | DeliveryStatus;

/**
 * Alias status IDs from the platform's 5-step ORDER_STATUSES set
 * (`pending | confirmed | preparing | ready | delivered`) to the tracker's
 * internal step IDs. This lets the customer confirmation page pass the raw
 * order status without a manual mapping at the call site.
 *
 * Dine-in mapping:  pending/confirmed → received, preparing → preparing,
 *                   ready → ready, delivered → served.
 * Delivery mapping: pending/confirmed → received, preparing → preparing,
 *                   ready → on-way, delivered → delivered.
 */
export type PlatformOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type AnyOrderStatus = OrderStatus | PlatformOrderStatus;

export interface OrderTrackerProps {
  /** The data-theme attribute value; drives CSS custom property cascade. */
  theme?: string;
  /**
   * Current order status. Accepts both the tracker's internal IDs
   * (`received | preparing | ready | served | on-way | delivered`) and the
   * platform's 5-step IDs (`pending | confirmed | preparing | ready | delivered | cancelled`).
   */
  status?: AnyOrderStatus;
  /** Dine-in shows Ready/Served; delivery shows On the way/Delivered. */
  type?: OrderType;
  /** Displayed order reference number. */
  orderNumber?: string | number;
  /** Estimated time string, e.g. "8 min" or "18 min". Shown next to current step label. */
  eta?: string;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface Step {
  id: string;
  labelKey: string;
}

const DINE_IN_STEPS: Step[] = [
  { id: 'received',  labelKey: 'Received'   },
  { id: 'preparing', labelKey: 'Preparing'  },
  { id: 'ready',     labelKey: 'Ready'      },
  { id: 'served',    labelKey: 'Served'     },
];

const DELIVERY_STEPS: Step[] = [
  { id: 'received',  labelKey: 'Received'   },
  { id: 'preparing', labelKey: 'Preparing'  },
  { id: 'on-way',    labelKey: 'On the way' },
  { id: 'delivered', labelKey: 'Delivered'  },
];

// ---------------------------------------------------------------------------
// Status alias resolver
// ---------------------------------------------------------------------------

/**
 * Map a platform 5-step status to the tracker's internal step ID.
 * For statuses already in the tracker vocabulary (`received`, `serving`, etc.)
 * the value is returned unchanged.
 */
function resolveStatus(raw: AnyOrderStatus, type: OrderType): OrderStatus {
  if (type === 'delivery') {
    switch (raw) {
      case 'pending':
      case 'confirmed':
        return 'received';
      case 'preparing':
        return 'preparing';
      case 'ready':
        return 'on-way';
      case 'delivered':
        return 'delivered';
      case 'cancelled':
        return 'received'; // show first step greyed-out for cancelled
      default:
        return raw as OrderStatus;
    }
  }
  // dine-in (default)
  switch (raw) {
    case 'pending':
    case 'confirmed':
      return 'received';
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'delivered':
      return 'served';
    case 'cancelled':
      return 'received'; // show first step greyed-out for cancelled
    default:
      return raw as OrderStatus;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderTracker({
  theme,
  status = 'preparing',
  type = 'dine-in',
  orderNumber = '—',
  eta,
}: OrderTrackerProps) {
  const t = useT();
  const steps = type === 'delivery' ? DELIVERY_STEPS : DINE_IN_STEPS;
  const resolvedStatus = resolveStatus(status, type);
  const idx = steps.findIndex((s) => s.id === resolvedStatus);
  const currentLabel = idx >= 0 ? t(steps[idx].labelKey) : '';
  const defaultEta = type === 'delivery' ? t('ETA 18 min') : t('Est. 8 min');
  const etaDisplay = eta ?? defaultEta;

  return (
    <>
      {/* Inject responsive styles once per render — no JSX-specific CSS-in-JS needed */}
      <style>{RESPONSIVE_STYLES}</style>
      <div
        data-theme={theme}
        style={{
          padding: 20,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Order ref */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 6,
          }}
        >
          {t('Order')} #{orderNumber}
        </div>

        {/* Current step + ETA */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--font-display-weight)',
            fontSize: 22,
            color: 'var(--color-text)',
            marginBottom: 20,
          }}
        >
          {currentLabel} — {etaDisplay}
        </div>

        {/* Step bubbles — responsive: row on ≥640px, column on <640px */}
        <div className="order-tracker-steps">
          {steps.map((step, i) => {
            const done = i <= idx;
            const active = i === idx;
            return (
              <div key={step.id} className="order-tracker-step">
                {/* Connector line between steps (hidden on last step) */}
                {i < steps.length - 1 && (
                  <div
                    className="order-tracker-connector"
                    style={{
                      background: i < idx ? 'var(--color-primary)' : 'var(--color-border)',
                    }}
                  />
                )}

                {/* Bubble */}
                <div
                  aria-label={`${t(step.labelKey)}${active ? ` (${t('current')})` : ''}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-full)',
                    background: done ? 'var(--color-primary)' : 'var(--color-bg-muted)',
                    border: active ? '3px solid var(--color-primary-light)' : 'none',
                    color: done ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: active ? '0 0 0 6px var(--color-primary-light)' : 'none',
                    transition: 'all 200ms',
                    /* On wide layout, centre horizontally; overridden to flexShrink via inline */
                    margin: '0 auto',
                  }}
                >
                  {done ? '✓' : i + 1}
                </div>

                {/* Step label */}
                <div
                  className="order-tracker-step-label"
                  style={{
                    color: done ? 'var(--color-text)' : 'var(--color-text-tertiary)',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {t(step.labelKey)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
