import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type TourStepType = 'info' | 'action' | 'input';

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
  stepType: TourStepType;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;
const TOOLTIP_MAX_WIDTH = 340;

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
      style.top = Math.max(16, Math.min(
        targetRect.bottom + PADDING + TOOLTIP_GAP,
        window.innerHeight - 220,
      ));
      style.left = Math.max(16, Math.min(centerX - TOOLTIP_MAX_WIDTH / 2, window.innerWidth - TOOLTIP_MAX_WIDTH - 16));
      break;
    case 'top':
      style.bottom = Math.max(16, Math.min(
        window.innerHeight - targetRect.top + PADDING + TOOLTIP_GAP,
        window.innerHeight - 220,
      ));
      style.left = Math.max(16, Math.min(centerX - TOOLTIP_MAX_WIDTH / 2, window.innerWidth - TOOLTIP_MAX_WIDTH - 16));
      break;
    case 'right':
      style.top = Math.max(16, Math.min(centerY - 60, window.innerHeight - 200));
      style.left = targetRect.right + PADDING + TOOLTIP_GAP;
      if (style.left as number > window.innerWidth - TOOLTIP_MAX_WIDTH - 16) {
        style.left = Math.max(16, Math.min(centerX - TOOLTIP_MAX_WIDTH / 2, window.innerWidth - TOOLTIP_MAX_WIDTH - 16));
        style.top = targetRect.bottom + PADDING + TOOLTIP_GAP;
      }
      break;
    case 'left':
      style.top = Math.max(16, Math.min(centerY - 60, window.innerHeight - 200));
      style.right = window.innerWidth - targetRect.left + PADDING + TOOLTIP_GAP;
      if ((style.right as number) > window.innerWidth - TOOLTIP_MAX_WIDTH - 16) {
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
  stepType,
}: TourOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isCenter = !targetRect || placement === 'center';
  const isLast = step === total - 1;

  // For action/input steps, don't show Next — user must interact with the target
  const showNextButton = stepType === 'info';
  const buttonLabel = actionLabel ?? (isLast ? 'Got it' : 'Next');

  const tooltipStyle = getTooltipStyle(targetRect, placement);

  // Compute the cutout area for the target
  const cutout = targetRect && !isCenter
    ? {
        top: targetRect.top - PADDING,
        left: targetRect.left - PADDING,
        width: targetRect.width + PADDING * 2,
        height: targetRect.height + PADDING * 2,
        bottom: targetRect.bottom + PADDING,
        right: targetRect.right + PADDING,
      }
    : null;

  const overlay: ReactNode = (
    <>
      {/* Pulsing ring around the spotlight to draw attention */}
      {cutout && (
        <>
          <style>{`
            @keyframes tourRingPulse {
              0%   { box-shadow: 0 0 0 0px rgba(251,191,36,0.8), 0 0 0 0px rgba(251,191,36,0.4); }
              60%  { box-shadow: 0 0 0 6px rgba(251,191,36,0),   0 0 0 12px rgba(251,191,36,0); }
              100% { box-shadow: 0 0 0 0px rgba(251,191,36,0),   0 0 0 0px rgba(251,191,36,0); }
            }
          `}</style>
          <div
            style={{
              position: 'fixed',
              top: cutout.top,
              left: cutout.left,
              width: cutout.width,
              height: cutout.height,
              borderRadius: 8,
              border: '2px solid rgba(251,191,36,0.9)',
              pointerEvents: 'none',
              zIndex: 90,
              animation: 'tourRingPulse 1.8s ease-out infinite',
            }}
          />
        </>
      )}

      {/* Visual spotlight overlay — pointer-events: none so it doesn't block anything */}
      <div
        className={[
          'fixed inset-0 z-[89] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ pointerEvents: 'none' }}
      >
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {cutout && (
                <rect
                  x={cutout.left}
                  y={cutout.top}
                  width={cutout.width}
                  height={cutout.height}
                  rx={8}
                  ry={8}
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
          />
        </svg>
      </div>

      {/* Click blockers — 4 divs around the target, blocking clicks on non-highlighted areas */}
      {/* The gap where the target is lets clicks pass through naturally */}
      {cutout ? (
        <div className="fixed inset-0 z-[88]" style={{ pointerEvents: 'none' }}>
          {/* Top region */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: Math.max(0, cutout.top),
              pointerEvents: 'auto',
              cursor: 'default',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Bottom region */}
          <div
            style={{
              position: 'absolute',
              top: cutout.bottom,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'auto',
              cursor: 'default',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Left region (between top and bottom) */}
          <div
            style={{
              position: 'absolute',
              top: cutout.top,
              left: 0,
              width: Math.max(0, cutout.left),
              height: cutout.height,
              pointerEvents: 'auto',
              cursor: 'default',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Right region (between top and bottom) */}
          <div
            style={{
              position: 'absolute',
              top: cutout.top,
              left: cutout.right,
              right: 0,
              height: cutout.height,
              pointerEvents: 'auto',
              cursor: 'default',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        /* Center steps: block all clicks except on the tooltip */
        <div
          className="fixed inset-0 z-[88]"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Tooltip — above everything */}
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

        {/* Step type hint for action/input steps */}
        {stepType === 'action' && !isCenter && (
          <p className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Click the highlighted element to continue
          </p>
        )}
        {stepType === 'input' && (
          <p className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Type in the highlighted field, then press Next
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip tour
          </button>
          {(showNextButton || stepType === 'input') && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-text-inverse hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}
