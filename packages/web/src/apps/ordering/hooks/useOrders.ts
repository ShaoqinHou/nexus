import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';
import type { Order, OrderStatus } from '../types';

export function useOrders(
  tenantSlug: string,
  filters?: Record<string, string>,
) {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  const query = params.toString();
  const path = `/t/${tenantSlug}/ordering/orders${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: orderingKeys.orders(filters),
    queryFn: () => apiClient.get<{ data: Order[] }>(path),
    select: (res) => res.data,
    refetchInterval: 10_000,
  });
}

export function useOrder(tenantSlug: string, orderId: string) {
  return useQuery({
    queryKey: orderingKeys.order(orderId),
    queryFn: () =>
      apiClient.get<{ data: Order }>(`/t/${tenantSlug}/ordering/orders/${orderId}`),
    select: (res) => res.data,
    enabled: !!orderId,
  });
}

export function useUpdateOrderStatus(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiClient.patch<{ data: Order }>(
        `/t/${tenantSlug}/ordering/orders/${id}/status`,
        { status },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}
