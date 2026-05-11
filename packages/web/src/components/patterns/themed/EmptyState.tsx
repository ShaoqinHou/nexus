/**
 * ThemedEmptyState — customer-facing empty-state panel that follows the active
 * cuisine theme's surface, display type, radius, and brand/accent tokens.
 */

import { ShoppingBag, type LucideIcon } from 'lucide-react';

export interface ThemedEmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface ThemedEmptyStateProps {
  /** The data-theme attribute value; drives CSS custom property cascade. */
  theme?: string;
  /** Lucide icon component. Defaults to ShoppingBag for ordering contexts. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ThemedEmptyStateAction;
}

export function ThemedEmptyState({
  theme,
  icon: Icon = ShoppingBag,
  title,
  description,
  action,
}: ThemedEmptyStateProps) {
  return (
    <div
      data-theme={theme}
      style={{
        padding: 40,
        textAlign: 'center',
        background: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px dashed var(--color-border-strong)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 64,
          height: 64,
          margin: '0 auto 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Icon size={32} strokeWidth={2.25} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--font-display-weight)',
          letterSpacing: 'var(--font-display-tracking)',
          fontSize: 20,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            maxWidth: 280,
            margin: '0 auto 20px',
          }}
        >
          {description}
        </div>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            minHeight: 'var(--hit-sm)',
            padding: '0 22px',
            background: 'var(--color-primary)',
            color: 'var(--color-text-inverse)',
            border: 'none',
            borderRadius: 'var(--radius-btn)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
