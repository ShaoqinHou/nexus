import { Check, ShoppingCart } from 'lucide-react';
import { createPortal } from 'react-dom';

interface AddToCartToastProps {
  show: boolean;
  itemName: string;
  quantity?: number;
  onComplete: () => void;
}

export function AddToCartToast({ show, itemName, quantity = 1, onComplete }: AddToCartToastProps) {
  if (!show) return null;

  return createPortal(
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up-fade">
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated rounded-full shadow-lg border border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success text-text-inverse">
          <Check className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-text">
            {quantity > 1 ? `${quantity}x ` : ''}{itemName} added
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
