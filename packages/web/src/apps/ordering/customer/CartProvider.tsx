import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

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

interface CartState {
  items: CartItem[];
  notes: string;
}

type AddItemPayload = {
  menuItemId: string;
  name: string;
  price: number;
  quantity?: number;
  notes?: string;
  modifiers?: CartItemModifier[];
  comboDealId?: string;
  comboSelections?: ComboSelection[];
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: AddItemPayload }
  | { type: 'REMOVE_ITEM'; payload: { cartIndex: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { cartIndex: number; quantity: number } }
  | { type: 'UPDATE_ITEM_NOTES'; payload: { cartIndex: number; notes: string } }
  | { type: 'SET_NOTES'; payload: { notes: string } }
  | { type: 'CLEAR_CART' };

interface CartContextValue {
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

const CartContext = createContext<CartContextValue | null>(null);

/** Check if two modifier arrays represent the same selection */
function sameModifiers(
  a: CartItemModifier[] | undefined,
  b: CartItemModifier[] | undefined,
): boolean {
  const aIds = (a ?? [])
    .map((m) => m.optionId)
    .sort()
    .join(',');
  const bIds = (b ?? [])
    .map((m) => m.optionId)
    .sort()
    .join(',');
  return aIds === bIds;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const addQty = action.payload.quantity ?? 1;
      const isCombo = !!action.payload.comboDealId;

      // Combo items are always unique entries (different selections = different entry)
      if (isCombo) {
        return {
          ...state,
          items: [
            ...state.items,
            {
              menuItemId: action.payload.menuItemId,
              name: action.payload.name,
              price: action.payload.price,
              quantity: addQty,
              notes: action.payload.notes,
              modifiers: action.payload.modifiers,
              comboDealId: action.payload.comboDealId,
              comboSelections: action.payload.comboSelections,
            },
          ],
        };
      }

      // Find existing item with same menuItemId AND same modifiers
      const existingIndex = state.items.findIndex(
        (item) =>
          !item.comboDealId &&
          item.menuItemId === action.payload.menuItemId &&
          sameModifiers(item.modifiers, action.payload.modifiers),
      );
      if (existingIndex >= 0) {
        return {
          ...state,
          items: state.items.map((item, i) =>
            i === existingIndex
              ? { ...item, quantity: item.quantity + addQty }
              : item,
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            menuItemId: action.payload.menuItemId,
            name: action.payload.name,
            price: action.payload.price,
            quantity: addQty,
            notes: action.payload.notes,
            modifiers: action.payload.modifiers,
          },
        ],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.payload.cartIndex),
      };
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (_, i) => i !== action.payload.cartIndex,
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.payload.cartIndex
            ? { ...item, quantity: action.payload.quantity }
            : item,
        ),
      };
    }
    case 'UPDATE_ITEM_NOTES':
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.payload.cartIndex
            ? { ...item, notes: action.payload.notes }
            : item,
        ),
      };
    case 'SET_NOTES':
      return { ...state, notes: action.payload.notes };
    case 'CLEAR_CART':
      return { items: [], notes: '' };
  }
}

function getStorageKey(tenantSlug: string, tableNumber: string): string {
  return `nexus_cart_${tenantSlug}_${tableNumber}`;
}

function loadCart(key: { tenantSlug: string; tableNumber: string }): CartState {
  try {
    const stored = sessionStorage.getItem(getStorageKey(key.tenantSlug, key.tableNumber));
    if (stored) {
      const parsed = JSON.parse(stored) as CartState;
      if (Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted storage — start fresh
  }
  return { items: [], notes: '' };
}

function saveCart(tenantSlug: string, tableNumber: string, state: CartState): void {
  try {
    sessionStorage.setItem(getStorageKey(tenantSlug, tableNumber), JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

interface CartProviderProps {
  tenantSlug: string;
  tableNumber: string;
  children: ReactNode;
}

export function CartProvider({ tenantSlug, tableNumber, children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, { tenantSlug, tableNumber }, loadCart);

  // Persist to sessionStorage on every change
  useEffect(() => {
    saveCart(tenantSlug, tableNumber, state);
  }, [tenantSlug, tableNumber, state]);

  const addItem = useCallback(
    (item: AddItemPayload) => {
      dispatch({ type: 'ADD_ITEM', payload: item });
    },
    [],
  );

  const removeItem = useCallback((cartIndex: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { cartIndex } });
  }, []);

  const updateQuantity = useCallback((cartIndex: number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { cartIndex, quantity } });
  }, []);

  const updateItemNotes = useCallback((cartIndex: number, notes: string) => {
    dispatch({ type: 'UPDATE_ITEM_NOTES', payload: { cartIndex, notes } });
  }, []);

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: 'SET_NOTES', payload: { notes } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const totalItems = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items],
  );

  const totalPrice = useMemo(
    () =>
      state.items.reduce((sum, item) => {
        // Combo items store their full unit price (base + modifiers) in item.price
        if (item.comboDealId) {
          return sum + item.price * item.quantity;
        }
        const modifierTotal = (item.modifiers ?? []).reduce(
          (ms, m) => ms + m.price,
          0,
        );
        return sum + (item.price + modifierTotal) * item.quantity;
      }, 0),
    [state.items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      notes: state.notes,
      addItem,
      removeItem,
      updateQuantity,
      updateItemNotes,
      setNotes,
      clearCart,
      totalItems,
      totalPrice,
    }),
    [
      state.items,
      state.notes,
      addItem,
      removeItem,
      updateQuantity,
      updateItemNotes,
      setNotes,
      clearCart,
      totalItems,
      totalPrice,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
