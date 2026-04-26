import { type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-muted text-text-secondary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-danger-light text-danger',
  info: 'bg-primary-light text-primary',
};

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        // --radius-chip varies per cuisine: counter=0 (square brutalist),
        // izakaya/sichuan/cantonese set to --radius-sm (slightly rounded),
        // bubble-tea/trattoria/taqueria/curry-house set to --radius-full
        // (pill). Hardcoded `rounded-full` flattened all themes to pill.
        'inline-flex items-center rounded-[var(--radius-chip)] px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
