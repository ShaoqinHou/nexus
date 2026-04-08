import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { formatPrice } from '@web/lib/format';
import { useToast } from '@web/platform/ToastProvider';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import { useValidatePromoCode } from '@web/apps/ordering/hooks/usePromotions';
import type { Order } from '@web/apps/ordering/types';

interface CreateOrderPayload {
  tableNumber: string;
  notes?: string;
  promoCode?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ optionId: string; name: string; price: number }>;
  }>;
  comboItems?: Array<{
    comboDealId: string;
    selections: Array<{ slotId: string; menuItemId: string }>;
    quantity: number;
    notes?: string;
  }>;
}

interface AppliedPromo {
  code: string;
  type: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderAmount: number | null;
  applicableCategories: string | null;
}

interface UseCartOrderOptions {
  tenantSlug: string;
  tableNumber: string;
  onOrderPlaced: (order: Order) => void;
  onClose?: () => void;
}

export function useCartOrder(options: UseCartOrderOptions) {
  const { tenantSlug, tableNumber, onOrderPlaced, onClose } = options;

  const { items, notes, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  const [editingNotesFor, setEditingNotesFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const validatePromo = useValidatePromoCode(tenantSlug);

  // Compute discount amount
  const discountAmount = appliedPromo
    ? appliedPromo.type === 'percentage'
      ? totalPrice * (appliedPromo.discountValue / 100)
      : Math.min(appliedPromo.discountValue, totalPrice)
    : 0;
  const finalTotal = Math.max(0, totalPrice - discountAmount);

  const handleApplyPromo = useCallback(() => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoError(null);
    validatePromo.mutate(code, {
      onSuccess: (promo) => {
        if (
          promo.minOrderAmount != null &&
          totalPrice < promo.minOrderAmount
        ) {
          setPromoError(
            `Minimum order of ${formatPrice(promo.minOrderAmount)} required`,
          );
          return;
        }
        setAppliedPromo({
          code: promo.code,
          type: promo.type,
          discountValue: promo.discountValue,
          minOrderAmount: promo.minOrderAmount,
          applicableCategories: promo.applicableCategories
            ? promo.applicableCategories.join(',')
            : null,
        });
        setPromoError(null);
        toast('success', 'Promo code applied!');
      },
      onError: (err: Error) => {
        setPromoError(err.message || 'Invalid promo code');
      },
    });
  }, [promoInput, validatePromo, totalPrice, toast]);

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  }, []);

  const placeOrderMutation = useMutation<Order, Error>({
    mutationFn: async () => {
      const regularItems = items.filter((item) => !item.comboDealId);
      const comboCartItems = items.filter((item) => !!item.comboDealId);

      const payload: CreateOrderPayload = {
        tableNumber: String(tableNumber),
        items: regularItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          ...(item.notes ? { notes: item.notes } : {}),
          ...(item.modifiers && item.modifiers.length > 0
            ? { modifiers: item.modifiers }
            : {}),
        })),
        ...(comboCartItems.length > 0
          ? {
              comboItems: comboCartItems.map((item) => ({
                comboDealId: item.comboDealId as string,
                selections: (item.comboSelections ?? []).map((s) => ({
                  slotId: s.slotId,
                  menuItemId: s.menuItemId,
                })),
                quantity: item.quantity,
                ...(item.notes ? { notes: item.notes } : {}),
              })),
            }
          : {}),
        ...(notes ? { notes } : {}),
        ...(appliedPromo ? { promoCode: appliedPromo.code } : {}),
      };
      const res = await apiClient.post<{ data: Order }>(
        `/order/${tenantSlug}/ordering/orders`,
        payload,
      );
      return res.data;
    },
    onSuccess: (order) => {
      clearCart();
      setError(null);
      setAppliedPromo(null);
      setPromoInput('');
      setPromoError(null);
      onClose?.();
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

  return {
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
  };
}
