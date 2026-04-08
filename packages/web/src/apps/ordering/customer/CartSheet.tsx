import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  ChevronUp,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@web/lib/api';
import { Button } from '@web/components/ui';
import { useToast } from '@web/platform/ToastProvider';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import type { Order } from '@web/apps/ordering/types';

interface CartSheetProps {
  tenantSlug: string;
  tableNumber: string;
  onOrderPlaced: (order: Order) => void;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

interface CreateOrderPayload {
  tableNumber: string;
  notes?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ optionId: string; name: string; price: number }>;
  }>;
}

export function CartSheet({
  tenantSlug,
  tableNumber,
  onOrderPlaced,
}: CartSheetProps) {
  const {
    items,
    notes,
    updateQuantity,
    updateItemNotes,
    removeItem,
    setNotes,
    clearCart,
    totalItems,
    totalPrice,
  } = useCart();

  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingNotesFor, setEditingNotesFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeOrderMutation = useMutation<Order, Error>({
    mutationFn: async () => {
      const payload: CreateOrderPayload = {
        tableNumber: String(tableNumber),
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          ...(item.notes ? { notes: item.notes } : {}),
          ...(item.modifiers && item.modifiers.length > 0
            ? { modifiers: item.modifiers }
            : {}),
        })),
        ...(notes ? { notes } : {}),
      };
      const res = await apiClient.post<{ data: Order }>(
        `/order/${tenantSlug}/ordering/orders`,
        payload,
      );
      return res.data;
    },
    onSuccess: (order) => {
      clearCart();
      setIsOpen(false);
      setError(null);
      toast('success', 'Order placed successfully!');
      onOrderPlaced(order);
    },
    onError: (err) => {
      setError(err.message || 'Failed to place order. Please try again.');
    },
  });

  const handlePlaceOrder = useCallback(() => {
    setError(null);
    placeOrderMutation.mutate();
  }, [placeOrderMutation]);

  const toggleSheet = useCallback(() => {
    setIsOpen((prev) => !prev);
    setError(null);
  }, []);

  const closeSheet = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  // Don't render anything if cart is empty
  if (totalItems === 0) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={closeSheet}
          aria-hidden="true"
        />
      )}

      {/* Sheet */}
      <div
        className={[
          'fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]',
        ].join(' ')}
      >
        <div className="max-w-lg mx-auto bg-bg-elevated border-t border-x border-border rounded-t-2xl shadow-lg flex flex-col max-h-[85vh]">
          {/* Collapsed bar / Sheet header */}
          <button
            type="button"
            onClick={toggleSheet}
            className="flex items-center justify-between px-4 py-4 w-full text-left shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-primary text-text-inverse text-[10px] font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <span className="text-sm font-semibold text-text">
                {isOpen ? 'Your Cart' : 'View Cart'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text">
                {formatPrice(totalPrice)}
              </span>
              <ChevronUp
                className={[
                  'h-4 w-4 text-text-secondary transition-transform',
                  isOpen ? 'rotate-180' : '',
                ].join(' ')}
              />
            </div>
          </button>

          {/* Expanded content */}
          {isOpen && (
            <>
              {/* Close button */}
              <div className="px-4 pb-2 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={closeSheet}
                  className="p-1 rounded-full hover:bg-bg-muted transition-colors text-text-secondary"
                  aria-label="Close cart"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-0">
                {items.map((item, index) => {
                  const modifierTotal = (item.modifiers ?? []).reduce(
                    (sum, m) => sum + m.price,
                    0,
                  );
                  const itemTotal =
                    (item.price + modifierTotal) * item.quantity;
                  const cartKey = `${item.menuItemId}-${index}`;

                  return (
                    <div
                      key={cartKey}
                      className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-bg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-text truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-text-secondary">
                            {formatPrice(item.price)} each
                          </p>
                          {/* Modifier details */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              +{' '}
                              {item.modifiers
                                .map(
                                  (m) =>
                                    `${m.name}${m.price > 0 ? ` (+${formatPrice(m.price)})` : ''}`,
                                )
                                .join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-text whitespace-nowrap">
                          {formatPrice(itemTotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(index, item.quantity - 1)
                            }
                            className="h-7 w-7 flex items-center justify-center rounded-full border border-border text-text-secondary hover:bg-bg-muted transition-colors"
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-semibold text-text w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(index, item.quantity + 1)
                            }
                            className="h-7 w-7 flex items-center justify-center rounded-full bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNotesFor(
                                editingNotesFor === cartKey ? null : cartKey,
                              )
                            }
                            className={[
                              'p-1.5 rounded transition-colors',
                              item.notes
                                ? 'text-primary'
                                : 'text-text-tertiary hover:text-text-secondary',
                            ].join(' ')}
                            aria-label={`Add note for ${item.name}`}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 rounded text-text-tertiary hover:text-danger transition-colors"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Item notes input */}
                      {editingNotesFor === cartKey && (
                        <input
                          type="text"
                          value={item.notes ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateItemNotes(index, e.target.value)
                          }
                          placeholder="Special requests..."
                          className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Order notes */}
                <div className="pb-2">
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Order Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNotes(e.target.value)
                    }
                    placeholder="Any special requests for your order..."
                    rows={2}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-4 space-y-3 shrink-0">
                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 text-xs text-danger bg-danger-light rounded-lg px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Total</span>
                  <span className="text-lg font-bold text-text">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Place order button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handlePlaceOrder}
                  loading={placeOrderMutation.isPending}
                  disabled={items.length === 0}
                >
                  Place Order
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
