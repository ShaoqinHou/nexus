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

import { useCallback, useRef, useState } from 'react';
import { Check } from 'lucide-react';
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
  /**
   * Called after the promo code is successfully copied to the clipboard.
   * Receives the copied code so callers can show a toast.
   */
  onCopy?: (code: string) => void;
}

// ---------------------------------------------------------------------------
// Tap-not-scroll heuristic constants
// ---------------------------------------------------------------------------

/** Max duration (ms) for a touch/pointer sequence to be treated as a tap. */
const TAP_MAX_MS = 250;
/** Max squared displacement (px²) to be treated as a tap. 100 = 10px radius. */
const TAP_MAX_SQ = 100;
/** How long (ms) to show the "copied" confirmation state on the chip. */
const COPIED_FEEDBACK_MS = 500;

// ---------------------------------------------------------------------------
// Clipboard helper
// ---------------------------------------------------------------------------

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for older browsers / WebViews
  return new Promise<void>((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) resolve();
    else reject(new Error('execCommand copy failed'));
  });
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
  onCopy,
}: PromoCardProps) {
  const t = useT();

  // ---- tap-not-scroll state ------------------------------------------------
  const tapOriginRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    tapOriginRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!code || !tapOriginRef.current) return;
      const origin = tapOriginRef.current;
      tapOriginRef.current = null;

      const dt = Date.now() - origin.t;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      const distSq = dx * dx + dy * dy;

      // Only treat as tap if fast and little movement
      if (dt >= TAP_MAX_MS || distSq >= TAP_MAX_SQ) return;

      copyToClipboard(code).then(() => {
        setCopied(true);
        onCopy?.(code);
        setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      });
    },
    [code, onCopy],
  );

  // Cancel tap on pointer leave so scrolling past doesn't fire
  const handlePointerLeave = useCallback(() => {
    tapOriginRef.current = null;
  }, []);

  // Keyboard activation for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!code) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyToClipboard(code).then(() => {
          setCopied(true);
          onCopy?.(code);
          setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
        });
      }
    },
    [code, onCopy],
  );

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

        {/* Promo code chip — tap/click to copy */}
        {code && (
          <button
            type="button"
            aria-label={t('Copy promo code') + ' ' + code}
            aria-pressed={copied}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onKeyDown={handleKeyDown}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: copied ? 'var(--color-success)' : 'var(--color-text-inverse)',
              color: copied ? 'var(--color-text-inverse)' : 'var(--color-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-chip)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 150ms ease, color 150ms ease',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            {copied ? (
              <>
                <Check size={12} aria-hidden="true" />
                {t('Copied!')}
              </>
            ) : (
              <>
                {t('Code')} {code}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
