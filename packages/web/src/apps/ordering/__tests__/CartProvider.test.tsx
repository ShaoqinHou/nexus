import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '@web/apps/ordering/customer/CartProvider';
import type { ReactNode } from 'react';

// Mock sessionStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
});

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider tenantSlug="test">{children}</CartProvider>;
}

function addSampleItem(
  addItem: (item: { menuItemId: string; name: string; price: number }) => void,
  overrides?: Partial<{ menuItemId: string; name: string; price: number }>,
) {
  act(() => {
    addItem({
      menuItemId: 'item-1',
      name: 'Margherita Pizza',
      price: 12.5,
      ...overrides,
    });
  });
}

beforeEach(() => {
  // Clear mock storage before each test
  for (const key of Object.keys(mockStorage)) {
    delete mockStorage[key];
  }
});

describe('CartProvider', () => {
  it('starts with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.notes).toBe('');
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('addItem adds a new item with quantity 1', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual({
      menuItemId: 'item-1',
      name: 'Margherita Pizza',
      price: 12.5,
      quantity: 1,
    });
  });

  it('addItem increments quantity for existing item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);
    addSampleItem(result.current.addItem);

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });

  it('removeItem removes item from cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);
    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.removeItem(0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('updateQuantity changes item quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);

    act(() => {
      result.current.updateQuantity(0, 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
  });

  it('updateQuantity to 0 removes item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);
    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.updateQuantity(0, 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('updateItemNotes sets notes for an item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);

    act(() => {
      result.current.updateItemNotes(0, 'No onions please');
    });

    expect(result.current.items[0].notes).toBe('No onions please');
  });

  it('setNotes sets order-level notes', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.setNotes('Please deliver ASAP');
    });

    expect(result.current.notes).toBe('Please deliver ASAP');
  });

  it('clearCart resets to empty state', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);
    addSampleItem(result.current.addItem, {
      menuItemId: 'item-2',
      name: 'Garlic Bread',
      price: 6.0,
    });
    act(() => {
      result.current.setNotes('Some notes');
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.notes).toBe('Some notes');

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.notes).toBe('');
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('totalItems sums all quantities', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem, {
      menuItemId: 'item-1',
      name: 'Pizza',
      price: 12.5,
    });
    addSampleItem(result.current.addItem, {
      menuItemId: 'item-1',
      name: 'Pizza',
      price: 12.5,
    });
    addSampleItem(result.current.addItem, {
      menuItemId: 'item-2',
      name: 'Garlic Bread',
      price: 6.0,
    });

    // item-1 qty=2, item-2 qty=1
    expect(result.current.totalItems).toBe(3);
  });

  it('totalPrice calculates correctly (price * quantity for each)', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem, {
      menuItemId: 'item-1',
      name: 'Pizza',
      price: 12.5,
    });
    addSampleItem(result.current.addItem, {
      menuItemId: 'item-1',
      name: 'Pizza',
      price: 12.5,
    });
    addSampleItem(result.current.addItem, {
      menuItemId: 'item-2',
      name: 'Garlic Bread',
      price: 6.0,
    });

    // (12.5 * 2) + (6.0 * 1) = 31.0
    expect(result.current.totalPrice).toBe(31.0);
  });

  it('persists cart to sessionStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    addSampleItem(result.current.addItem);

    const stored = JSON.parse(mockStorage['nexus_cart_test'] ?? '{}');
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].menuItemId).toBe('item-1');
  });

  it('loads cart from sessionStorage on mount', () => {
    mockStorage['nexus_cart_test'] = JSON.stringify({
      items: [
        {
          menuItemId: 'saved-1',
          name: 'Saved Item',
          price: 9.99,
          quantity: 3,
        },
      ],
      notes: 'Saved notes',
    });

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].menuItemId).toBe('saved-1');
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.notes).toBe('Saved notes');
    expect(result.current.totalPrice).toBe(29.97);
  });

  it('throws when useCart is used outside CartProvider', () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within a CartProvider');

    consoleSpy.mockRestore();
  });
});
