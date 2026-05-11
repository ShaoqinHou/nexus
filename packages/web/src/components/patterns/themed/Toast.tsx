/**
 * ThemedToast — static, theme-aware notification block from the reference
 * themed-components set. Runtime app toasts still use ToastContainer; this
 * component gives customer surfaces and the Zoo a reusable themed toast card.
 */

import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export type ThemedToastKind = 'success' | 'warning' | 'error' | 'danger' | 'info';

export interface ThemedToastProps {
  /** The data-theme attribute value; drives CSS custom property cascade. */
  theme?: string;
  kind?: ThemedToastKind;
  title: string;
  description?: string;
}

const tone = {
  success: {
    fg: 'var(--color-success)',
    bg: 'var(--color-success-light)',
    Icon: CheckCircle,
  },
  warning: {
    fg: 'var(--color-warning)',
    bg: 'var(--color-warning-light)',
    Icon: AlertTriangle,
  },
  error: {
    fg: 'var(--color-danger)',
    bg: 'var(--color-danger-light)',
    Icon: XCircle,
  },
  danger: {
    fg: 'var(--color-danger)',
    bg: 'var(--color-danger-light)',
    Icon: XCircle,
  },
  info: {
    fg: 'var(--color-info)',
    bg: 'var(--color-info-light)',
    Icon: Info,
  },
} as const;

export function ThemedToast({
  theme,
  kind = 'success',
  title,
  description,
}: ThemedToastProps) {
  const { fg, bg, Icon } = tone[kind];

  return (
    <div
      data-theme={theme}
      role="status"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${fg}`,
        borderRadius: 'var(--radius-card)',
        padding: 14,
        display: 'flex',
        gap: 12,
        boxShadow: 'var(--shadow-md)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        minWidth: 320,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-full)',
          background: bg,
          color: fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
