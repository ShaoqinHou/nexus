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
 * Typical usage: customer confirmation page, kitchen display status header.
 */

import { useT } from '@web/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderType = 'dine-in' | 'delivery';

/** Status IDs for dine-in orders. */
export type DineInStatus = 'received' | 'preparing' | 'ready' | 'served';

/** Status IDs for delivery orders. */
export type DeliveryStatus = 'received' | 'preparing' | 'on-way' | 'delivered';

export type OrderStatus = DineInStatus | DeliveryStatus;

export interface OrderTrackerProps {
  /** The data-theme attribute value; drives CSS custom property cascade. */
  theme?: string;
  /** Current order status — must be a valid ID for the chosen `type`. */
  status?: OrderStatus;
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
  const idx = steps.findIndex((s) => s.id === status);
  const currentLabel = idx >= 0 ? t(steps[idx].labelKey) : '';
  const defaultEta = type === 'delivery' ? t('ETA 18 min') : t('Est. 8 min');
  const etaDisplay = eta ?? defaultEta;

  return (
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

      {/* Step bubbles */}
      <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
        {steps.map((step, i) => {
          const done = i <= idx;
          const active = i === idx;
          return (
            <div
              key={step.id}
              style={{ flex: 1, textAlign: 'center', position: 'relative' }}
            >
              {/* Connector line between steps */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 13,
                    left: '50%',
                    right: '-50%',
                    height: 2,
                    background: i < idx ? 'var(--color-primary)' : 'var(--color-border)',
                    zIndex: 0,
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
                  margin: '0 auto',
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  boxShadow: active ? '0 0 0 6px var(--color-primary-light)' : 'none',
                  transition: 'all 200ms',
                }}
              >
                {done ? '✓' : i + 1}
              </div>

              {/* Step label */}
              <div
                style={{
                  fontSize: 11,
                  marginTop: 8,
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
  );
}
