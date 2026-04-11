interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-primary' : 'bg-border-strong',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-text-inverse shadow-sm transform transition-transform duration-200',
            'translate-y-0.5',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
      {label && (
        <span className={[
          'text-sm',
          disabled ? 'text-text-tertiary' : 'text-text',
        ].join(' ')}>
          {label}
        </span>
      )}
    </label>
  );
}
