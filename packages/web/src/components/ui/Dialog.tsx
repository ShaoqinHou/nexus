import { type ReactNode, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useT } from '@web/lib/i18n';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  'data-tour'?: string;
}

export function Dialog({ open, onClose, title, children, footer, 'data-tour': dataTour }: DialogProps) {
  const t = useT();
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        {...(dataTour ? { 'data-tour': dataTour } : {})}
        className="w-full max-w-lg rounded-lg bg-bg-elevated shadow-lg border border-border flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden"
      >
        {/* Header (sticky) */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[var(--hit-sm)] min-w-[var(--hit-sm)] flex items-center justify-center rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary active:scale-[0.95]"
            aria-label={t('Close dialog')}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body (scrolls) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">{children}</div>

        {/* Footer (sticky) */}
        {footer && (
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
