import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useCategories, useMenuItems } from '@web/apps/ordering/hooks/useMenu';
import { useOrders, useOrder } from '@web/apps/ordering/hooks/useOrders';
import type { ReactNode } from 'react';
import type { MenuCategory, MenuItem, Order } from '@web/apps/ordering/types';

// --- MSW Server ---

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// --- Query Client Wrapper ---

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// --- Fixtures ---

const mockCategory: MenuCategory = {
  id: 'cat-1',
  tenantId: 'tenant-1',
  name: 'Mains',
  description: 'Main courses',
  sortOrder: 0,
  isActive: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCategory2: MenuCategory = {
  id: 'cat-2',
  tenantId: 'tenant-1',
  name: 'Desserts',
  description: null,
  sortOrder: 1,
  isActive: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockItem: MenuItem = {
  id: 'item-1',
  tenantId: 'tenant-1',
  categoryId: 'cat-1',
  name: 'Margherita Pizza',
  description: 'Classic pizza',
  price: 12.5,
  imageUrl: null,
  isAvailable: 1,
  sortOrder: 0,
  isActive: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockOrder: Order = {
  id: 'order-1',
  tenantId: 'tenant-1',
  sessionId: 'session-1',
  tableNumber: '5',
  status: 'pending',
  notes: null,
  total: 25.0,
  items: [
    {
      id: 'oi-1',
      orderId: 'order-1',
      menuItemId: 'item-1',
      name: 'Margherita Pizza',
      price: 12.5,
      quantity: 2,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// --- Tests ---

describe('useCategories', () => {
  it('fetches categories from correct API path', async () => {
    let requestUrl = '';
    server.use(
      http.get('/api/t/:tenantSlug/ordering/categories', ({ request }) => {
        requestUrl = new URL(request.url).pathname;
        return HttpResponse.json({ data: [mockCategory, mockCategory2] });
      }),
    );

    const { result } = renderHook(() => useCategories('test-slug'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestUrl).toBe('/api/t/test-slug/ordering/categories');
  });

  it('unwraps { data: [...] } response correctly', async () => {
    server.use(
      http.get('/api/t/:tenantSlug/ordering/categories', () => {
        return HttpResponse.json({ data: [mockCategory, mockCategory2] });
      }),
    );

    const { result } = renderHook(() => useCategories('test-slug'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('Mains');
    expect(result.current.data![1].name).toBe('Desserts');
  });
});

describe('useMenuItems', () => {
  it('fetches all items when no categoryId is provided', async () => {
    let requestUrl = '';
    server.use(
      http.get('/api/t/:tenantSlug/ordering/items', ({ request }) => {
        requestUrl = new URL(request.url).pathname;
        return HttpResponse.json({ data: [mockItem] });
      }),
    );

    const { result } = renderHook(() => useMenuItems('test-slug'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestUrl).toBe('/api/t/test-slug/ordering/items');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('Margherita Pizza');
  });

  it('fetches items with categoryId filter', async () => {
    let requestSearch = '';
    server.use(
      http.get('/api/t/:tenantSlug/ordering/items', ({ request }) => {
        requestSearch = new URL(request.url).search;
        return HttpResponse.json({ data: [mockItem] });
      }),
    );

    const { result } = renderHook(() => useMenuItems('test-slug', 'cat-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestSearch).toBe('?categoryId=cat-1');
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useOrders', () => {
  it('fetches orders and unwraps response', async () => {
    server.use(
      http.get('/api/t/:tenantSlug/ordering/orders', () => {
        return HttpResponse.json({ data: [mockOrder], total: 1, page: 1, limit: 50 });
      }),
    );

    const { result } = renderHook(() => useOrders('test-slug'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].id).toBe('order-1');
    expect(result.current.data?.data[0].status).toBe('pending');
    expect(result.current.data?.data[0].items).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.page).toBe(1);
  });

  it('builds query string from filters', async () => {
    let requestSearch = '';
    server.use(
      http.get('/api/t/:tenantSlug/ordering/orders', ({ request }) => {
        requestSearch = new URL(request.url).search;
        return HttpResponse.json({ data: [], total: 0, page: 1, limit: 50 });
      }),
    );

    const { result } = renderHook(
      () => useOrders('test-slug', { status: 'pending', table: '3' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = new URLSearchParams(requestSearch);
    expect(params.get('status')).toBe('pending');
    expect(params.get('table')).toBe('3');
  });

  it('omits empty filter values from query string', async () => {
    let requestSearch = '';
    server.use(
      http.get('/api/t/:tenantSlug/ordering/orders', ({ request }) => {
        requestSearch = new URL(request.url).search;
        return HttpResponse.json({ data: [], total: 0, page: 1, limit: 50 });
      }),
    );

    const { result } = renderHook(
      () => useOrders('test-slug', { status: 'confirmed', table: '' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = new URLSearchParams(requestSearch);
    expect(params.get('status')).toBe('confirmed');
    expect(params.has('table')).toBe(false);
  });
});

describe('useOrder', () => {
  it('fetches a single order by id', async () => {
    server.use(
      http.get('/api/t/:tenantSlug/ordering/orders/:orderId', () => {
        return HttpResponse.json({ data: mockOrder });
      }),
    );

    const { result } = renderHook(
      () => useOrder('test-slug', 'order-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.id).toBe('order-1');
    expect(result.current.data!.tableNumber).toBe('5');
    expect(result.current.data!.total).toBe(25.0);
  });
});
