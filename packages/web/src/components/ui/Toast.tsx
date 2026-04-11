import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
} as const;

const typeClasses: Record<ToastData['type'], string> = {
  success: 'bg-success-light text-success border-success/20',
  error: 'bg-danger-light text-danger border-danger/20',
  info: 'bg-primary-light text-primary border-primary/20',
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const Icon = iconMap[toast.type];

  return (
    <div
      role="alert"
      className={[
        'flex items-center gap-3 px-4 py-3.5 min-h-[52px] rounded-lg border shadow-md',
        'transition-all duration-300 ease-out',
        visible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
        typeClasses[toast.type],
      ].join(' ')}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium flex-1 text-text">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-bg-muted/50 transition-colors text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const visibleToasts = toasts.slice(-5);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {visibleToasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
