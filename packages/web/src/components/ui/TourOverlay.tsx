import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TourOverlayProps {
  targetRect: DOMRect | null;
  title: string;
  description: string;
  step: number;
  total: number;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  onNext: () => void;
  onSkip: () => void;
  actionLabel?: string;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;
const TOOLTIP_MAX_WIDTH = 340;
const BORDER_RADIUS = 8;

function getTooltipStyle(
  targetRect: DOMRect | null,
  placement: TourOverlayProps['placement'],
): React.CSSProperties {
  if (!targetRect || placement === 'center') {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: TOOLTIP_MAX_WIDTH,
      width: '90vw',
    };
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    maxWidth: TOOLTIP_MAX_WIDTH,
    width: '90vw',
  };

  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;

  switch (placement) {
    case 'bottom':
      style.top = targetRect.bottom + PADDING + TOOLTIP_GAP;
      style.left = Math.max(16, Math.min(centerX - TOOLTIP_MAX_WIDTH / 2, window.innerWidth - TOOLTIP_MAX_WIDTH - 16));
      break;
    case 'top':
      style.bottom = window.innerHeight - targetRect.top + PADDING + TOOLTIP_GAP;
      style.left = Math.max(16, Math.min(centerX - TOOLTIP_MAX_WIDTH / 2, window.innerWidth - TOOLTIP_MAX_WIDTH - 16));
      break;
    case 'right':
      style.top = Math.max(16, Math.min(centerY - 60, window.innerHeight - 200));
      style.left = targetRect.right + PADDING + TOOLTIP_GAP;
      if (style.left as number > window.innerWidth - TOOLTIP_MAX_WIDTH - 16) {
        // Fall back to bottom placement
        style.left = Math.max(16, Math.min(centerX - TOOLTIP_MAX_WIDTH / 2, window.innerWidth - TOOLTIP_MAX_WIDTH - 16));
        style.top = targetRect.bottom + PADDING + TOOLTIP_GAP;
      }
      break;
    case 'left':
      style.top = Math.max(16, Math.min(centerY - 60, window.innerHeight - 200));
      style.right = window.innerWidth - targetRect.left + PADDING + TOOLTIP_GAP;
      if ((style.right as number) > window.innerWidth - TOOLTIP_MAX_WIDTH - 16) {
        // Fall back to bottom placement
        style.left = Math.max(16, Math.min(centerX - TOOLTIP_MAX_WIDTH / 2, window.innerWidth - TOOLTIP_MAX_WIDTH - 16));
        style.top = targetRect.bottom + PADDING + TOOLTIP_GAP;
        delete style.right;
      }
      break;
  }

  return style;
}

export function TourOverlay({
  targetRect,
  title,
  description,
  step,
  total,
  placement,
  onNext,
  onSkip,
  actionLabel,
}: TourOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isCenter = !targetRect || placement === 'center';
  const isLast = step === total - 1;
  const buttonLabel = actionLabel ?? (isLast ? 'Got it' : 'Next');

  const tooltipStyle = getTooltipStyle(targetRect, placement);

  const overlay: ReactNode = (
    <div
      className={[
        'fixed inset-0 z-[90] transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      aria-modal="true"
      role="dialog"
    >
      {/* SVG spotlight mask */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !isCenter && (
              <rect
                x={targetRect.left - PADDING}
                y={targetRect.top - PADDING}
                width={targetRect.width + PADDING * 2}
                height={targetRect.height + PADDING * 2}
                rx={BORDER_RADIUS}
                ry={BORDER_RADIUS}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={onSkip}
        />
      </svg>

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className={[
          'bg-bg-elevated border border-border rounded-xl shadow-lg p-5 z-[91] transition-all duration-300',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        ].join(' ')}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-tertiary">
            Step {step + 1} of {total}
          </span>
          {/* Progress dots */}
          <div className="flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <div
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-4 bg-primary' : 'w-1.5 bg-border-strong',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-text mb-1.5">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-text-inverse hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
