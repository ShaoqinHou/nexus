import { useState, useCallback, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  ChevronUp,
  MessageSquare,
  AlertCircle,
  Tag,
  Check,
} from 'lucide-react';
import { formatPrice } from '@web/lib/format';
import { Button, Badge } from '@web/components/ui';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import { useCartOrder } from '@web/apps/ordering/customer/useCartOrder';
import type { Order } from '@web/apps/ordering/types';

interface CartSheetProps {
  tenantSlug: string;
  tableNumber: string;
  onOrderPlaced: (order: Order) => void;
  addToOrderId?: string;
}

export function CartSheet({
  tenantSlug,
  tableNumber,
  onOrderPlaced,
  addToOrderId,
}: CartSheetProps) {
  const {
    items,
    notes,
    updateQuantity,
    updateItemNotes,
    removeItem,
    setNotes,
    totalItems,
    totalPrice,
  } = useCart();

  const [isOpen, setIsOpen] = useState(false);

  const {
    promoInput,
    setPromoInput,
    appliedPromo,
    promoError,
    setPromoError,
    discountAmount,
    finalTotal,
    handleApplyPromo,
    handleRemovePromo,
    validatePromo,
    placeOrderMutation,
    handlePlaceOrder,
    editingNotesFor,
    setEditingNotesFor,
    error,
  } = useCartOrder({
    tenantSlug,
    tableNumber,
    onOrderPlaced,
    onClose: () => { setIsOpen(false); },
    addToOrderId,
  });

  // Prevent body scroll when cart sheet is open, save/restore scroll position
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const toggleSheet = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeSheet = useCallback(() => {
    setIsOpen(false);
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
            className="flex items-center justify-between px-4 py-4 w-full text-left shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-primary text-text-inverse text-xs font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <span className="text-sm font-semibold text-text">
                {isOpen ? 'Your Cart' : 'View Cart'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text">
                {formatPrice(finalTotal)}
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
                  className="p-2 rounded-full hover:bg-bg-muted transition-colors text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Close cart"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-0">
                {items.map((item, index) => {
                  const isCombo = !!item.comboDealId;
                  const modifierTotal = isCombo
                    ? 0
                    : (item.modifiers ?? []).reduce(
                        (sum, m) => sum + m.price,
                        0,
                      );
                  const itemTotal = isCombo
                    ? item.price * item.quantity
                    : (item.price + modifierTotal) * item.quantity;
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
                          {/* Combo slot selections */}
                          {isCombo && item.comboSelections && item.comboSelections.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.comboSelections.map((sel) => (
                                <p key={sel.slotId} className="text-xs text-text-tertiary">
                                  {sel.slotName}: {sel.itemName}
                                  {sel.priceModifier > 0 ? ` (+${formatPrice(sel.priceModifier)})` : ''}
                                </p>
                              ))}
                            </div>
                          )}
                          {/* Modifier details */}
                          {!isCombo && item.modifiers && item.modifiers.length > 0 && (
                            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                              +{' '}
                              <span className="line-clamp-2">{item.modifiers
                                .map(
                                  (m) =>
                                    `${m.name}${m.price > 0 ? ` (+${formatPrice(m.price)})` : ''}`,
                                )
                                .join(', ')}</span>
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
                            className="h-9 w-9 flex items-center justify-center rounded-full border border-border text-text-secondary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                            className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-text-inverse hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNotesFor(
                                editingNotesFor === cartKey ? null : cartKey,
                              )
                            }
                            className={[
                              'p-2.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
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
                            className="p-2.5 rounded text-text-tertiary hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                          className="w-full text-sm px-2.5 py-1.5 rounded border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
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
                {/* Promo code section */}
                <div className="space-y-2">
                  {appliedPromo ? (
                    <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-bg">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <Badge variant="success">
                          {appliedPromo.type === 'percentage'
                            ? `${appliedPromo.discountValue}% OFF`
                            : `-${formatPrice(appliedPromo.discountValue)}`}
                        </Badge>
                        <span className="text-xs font-mono text-text-secondary">
                          {appliedPromo.code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="p-2 rounded text-text-tertiary hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Remove promo code"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setPromoInput(e.target.value);
                            setPromoError(null);
                          }}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyPromo();
                            }
                          }}
                          placeholder="Promo code"
                          className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleApplyPromo}
                        loading={validatePromo.isPending}
                        disabled={!promoInput.trim()}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                  {promoError && (
                    <p className="text-xs text-danger">{promoError}</p>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 text-xs text-danger bg-danger-light rounded-lg px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Price breakdown */}
                <div className="space-y-1">
                  {appliedPromo && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">Subtotal</span>
                        <span className="text-sm text-text">
                          {formatPrice(totalPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-success">Discount</span>
                        <span className="text-sm font-medium text-success">
                          -{formatPrice(discountAmount)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Total</span>
                    <span className="text-lg font-bold text-text">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
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
                  {addToOrderId ? 'Add to Order' : 'Place Order'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
