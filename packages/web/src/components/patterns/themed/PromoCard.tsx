/**
 * PromoCard — themed promotion banner.
 *
 * Displays a single promotion or discount offer with a high-contrast primary-colour
 * background, a decorative accent circle, and a mono-font promo code chip.
 *
 * Theme-awareness: `data-theme` on the root element causes all `var(--color-*)`
 * tokens to resolve to the active restaurant's theme preset values. The card will
 * automatically use the correct primary, accent, and text-inverse colours.
 *
 * Typical usage: customer menu screen banner, homepage highlights, order confirmation
 * upsell strip.
 */

import { useT } from '@web/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromoCardProps {
  /** The data-theme attribute value; drives CSS custom property cascade. */
  theme?: string;
  /** Short category label shown above the discount headline, e.g. "Happy Hour". */
  title?: string;
  /** Bold headline discount text, e.g. "25% OFF". */
  discount?: string;
  /** Supporting description line, e.g. "Weekdays 3–6pm · all appetisers". */
  description?: string;
  /** Promo code string to render in the code chip. Omit to hide the chip. */
  code?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromoCard({
  theme,
  title,
  discount,
  description,
  code,
}: PromoCardProps) {
  const t = useT();

  return (
    <div
      data-theme={theme}
      style={{
        background: 'var(--color-primary)',
        color: 'var(--color-text-inverse)',
        borderRadius: 'var(--radius-card)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        minWidth: 280,
      }}
    >
      {/* Decorative accent circle */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 120,
          height: 120,
          background: 'var(--color-accent)',
          opacity: 0.25,
          borderRadius: 'var(--radius-full)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative' }}>
        {/* Category label */}
        {title && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: 0.8,
              marginBottom: 8,
            }}
          >
            {title}
          </div>
        )}

        {/* Discount headline */}
        {discount && (
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--font-display-weight)',
              fontSize: 36,
              letterSpacing: 'var(--font-display-tracking)',
              marginBottom: 6,
              lineHeight: 1,
            }}
          >
            {discount}
          </div>
        )}

        {/* Description */}
        {description && (
          <div
            style={{
              fontSize: 13,
              opacity: 0.9,
              marginBottom: code ? 14 : 0,
            }}
          >
            {description}
          </div>
        )}

        {/* Promo code chip */}
        {code && (
          <div
            style={{
              display: 'inline-block',
              background: 'var(--color-text-inverse)',
              color: 'var(--color-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-chip)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            {t('Code')} {code}
          </div>
        )}
      </div>
    </div>
  );
}
