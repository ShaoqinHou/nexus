import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  MessageSquare,
  AlertCircle,
  Tag,
  Check,
  X,
} from 'lucide-react';
import { formatPrice } from '@web/lib/format';
import { Button, Badge } from '@web/components/ui';
import { useT } from '@web/lib/i18n';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import { useCartOrder } from '@web/apps/ordering/customer/useCartOrder';
import type { Order } from '@web/apps/ordering/types';

interface CartSidebarProps {
  tenantSlug: string;
  tableNumber: string;
  onOrderPlaced: (order: Order) => void;
  addToOrderId?: string;
  taxRate?: number;
  taxInclusive?: boolean;
  taxLabel?: string;
}

export function CartSidebar({
  tenantSlug,
  tableNumber,
  onOrderPlaced,
  addToOrderId,
  taxRate,
  taxInclusive,
  taxLabel,
}: CartSidebarProps) {
  const t = useT();
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
  } = useCartOrder({ tenantSlug, tableNumber, onOrderPlaced, addToOrderId });

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <ShoppingCart className="h-10 w-10 text-text-tertiary mb-3" />
        <p className="text-sm font-medium text-text-secondary">{t('Your cart is empty')}</p>
        <p className="text-xs text-text-tertiary mt-1">
          {t('Add items from the menu to get started')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-text">
            {t('Your Cart')} ({totalItems})
          </span>
        </div>
      </div>

      {/* Cart items — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
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
                    {formatPrice(item.price)} {t('each')}
                  </p>
                  {/* Combo slot selections */}
                  {isCombo && item.comboSelections && item.comboSelections.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {item.comboSelections.map((sel) => (
                        <div key={sel.slotId}>
                          <p className="text-xs text-text-tertiary">
                            {sel.slotName}: {sel.itemName}
                            {sel.priceModifier > 0 ? ` (+${formatPrice(sel.priceModifier)})` : ''}
                          </p>
                          {sel.modifiers && sel.modifiers.length > 0 && (
                            <p className="text-xs text-text-tertiary ml-3">
                              + {sel.modifiers
                                .map(
                                  (m) =>
                                    `${m.name}${m.price > 0 ? ` (+${formatPrice(m.price)})` : ''}`,
                                )
                                .join(', ')}
                            </p>
                          )}
                        </div>
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
                    className="h-12 w-12 flex items-center justify-center rounded-full border border-border text-text-secondary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]"
                    aria-label={`Decrease ${item.name} quantity`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-text w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(index, item.quantity + 1)
                    }
                    className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-text-inverse hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]"
                    aria-label={`Increase ${item.name} quantity`}
                  >
                    <Plus className="h-4 w-4" />
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
                      'min-h-[44px] min-w-[44px] flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      item.notes
                        ? 'text-primary'
                        : 'text-text-tertiary hover:text-text-secondary',
                    ].join(' ')}
                    aria-label={`Add note for ${item.name}`}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Item notes input */}
              {editingNotesFor === cartKey && (
                <div className="relative">
                  <input
                    type="text"
                    value={item.notes ?? ''}
                    maxLength={500}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateItemNotes(index, e.target.value)
                    }
                    placeholder={t('Special requests...')}
                    className="w-full text-sm h-12 px-3 rounded border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {(item.notes ?? '').length > 400 && (
                    <span className="absolute bottom-1 right-2 text-xs text-text-tertiary">{500 - (item.notes ?? '').length}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Order notes */}
        <div className="pb-2">
          <label className="text-xs font-medium text-text-secondary block mb-1">
            {t('Order Notes')}
          </label>
          <div className="relative">
            <textarea
              value={notes}
              maxLength={500}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(e.target.value)
              }
              placeholder={t('Any special requests for your order...')}
              rows={2}
              className="w-full text-sm h-12 px-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            {notes.length > 400 && (
              <span className="absolute bottom-1 right-2 text-xs text-text-tertiary">{500 - notes.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer — sticky at bottom */}
      <div className="border-t border-border px-4 py-3 space-y-3 shrink-0">
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
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={t('Remove promo code')}
              >
                <X className="h-4 w-4" />
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
                  placeholder={t('Promo code')}
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
                {t('Apply')}
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
          {(() => {
            const effectiveRate = taxRate ?? 0;
            const effectiveLabel = taxLabel || 'Tax';
            const hasTax = effectiveRate > 0;
            const showSubtotal = !!appliedPromo || (hasTax && !taxInclusive);

            let estimatedTax = 0;
            let displayTotal = finalTotal;
            if (hasTax) {
              if (taxInclusive) {
                estimatedTax = finalTotal - (finalTotal / (1 + effectiveRate / 100));
              } else {
                estimatedTax = finalTotal * (effectiveRate / 100);
                displayTotal = finalTotal + estimatedTax;
              }
              estimatedTax = Math.round(estimatedTax * 100) / 100;
              displayTotal = Math.round(displayTotal * 100) / 100;
            }

            return (
              <>
                {showSubtotal && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{t('Subtotal')}</span>
                    <span className="text-sm text-text">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                )}
                {appliedPromo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-success">{t('Discount')}</span>
                    <span className="text-sm font-medium text-success">
                      -{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}
                {hasTax && !taxInclusive && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      {t('Est.')} {effectiveLabel} ({effectiveRate}%)
                    </span>
                    <span className="text-sm text-text">
                      {formatPrice(estimatedTax)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t('Total')}</span>
                  <span className="text-lg font-bold text-text">
                    {formatPrice(displayTotal)}
                  </span>
                </div>
                {hasTax && taxInclusive && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">
                      {t('Incl.')} {effectiveLabel} ({effectiveRate}%)
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatPrice(estimatedTax)}
                    </span>
                  </div>
                )}
              </>
            );
          })()}
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
          {addToOrderId ? t('Add to Order') : t('Place Order')}
        </Button>
      </div>
    </div>
  );
}
