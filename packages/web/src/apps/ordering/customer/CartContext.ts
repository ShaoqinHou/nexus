/**
 * Stable CartContext singleton. Extracted into its own leaf module so that
 * Vite's HMR can never evaluate this file twice (it has no platform imports
 * that could trigger invalidation cascades). CartProvider.tsx and every
 * useCart() call must import from this file — not from each other — to
 * guarantee a single createContext() call across the module graph.
 */
import { createContext, useContext } from 'react';

export interface CartItemModifier {
  optionId: string;
  name: string;
  price: number;
}

export interface ComboSelection {
  slotId: string;
  slotName: string;
  menuItemId: string;
  itemName: string;
  priceModifier: number;
  modifiers?: CartItemModifier[];
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  modifiers?: CartItemModifier[];
  comboDealId?: string;
  comboSelections?: ComboSelection[];
}

export type AddItemPayload = {
  menuItemId: string;
  name: string;
  price: number;
  quantity?: number;
  notes?: string;
  modifiers?: CartItemModifier[];
  comboDealId?: string;
  comboSelections?: ComboSelection[];
};

export interface CartContextValue {
  items: CartItem[];
  notes: string;
  addItem: (item: AddItemPayload) => void;
  removeItem: (cartIndex: number) => void;
  updateQuantity: (cartIndex: number, quantity: number) => void;
  updateItemNotes: (cartIndex: number, notes: string) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
