import { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        // --radius-card flips per cuisine: counter=0px, izakaya/sichuan=3-5px
        // (sharp), classic=8px, trattoria/taqueria/curry-house=10-12px,
        // bubble-tea=12px+, wok=12px. Hardcoded `rounded-lg` flattened
        // everything; the semantic token makes the card shape itself a
        // theme-carrying signal.
        'rounded-[var(--radius-card)] border border-border bg-bg-elevated shadow-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={['px-4 sm:px-6 py-4 border-b border-border', className].join(' ')}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={['text-lg font-semibold text-text', className].join(' ')}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={['px-4 sm:px-6 py-4', className].join(' ')}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={[
        'px-4 sm:px-6 py-4 border-t border-border flex items-center',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
