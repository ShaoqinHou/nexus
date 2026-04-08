import { type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required = false,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      <label className="text-sm font-medium text-text">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
