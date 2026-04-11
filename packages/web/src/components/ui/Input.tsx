import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, helperText, className = '', id, ...props }, ref) {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full h-12 rounded-md border px-3 py-3 text-sm text-text bg-bg placeholder:text-text-tertiary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            error
              ? 'border-danger focus-visible:ring-danger'
              : 'border-border focus-visible:ring-primary',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-text-tertiary">{helperText}</p>
        )}
      </div>
    );
  },
);
