import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';
import type { Order, OrderStatus, PaymentStatus } from '../types';

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
    staleTime: 5000, // 5 seconds - orders change frequently
    gcTime: 60000, // 1 minute
    refetchInterval: 10_000, // Refetch every 10 seconds for real-time updates
  });
}

export function useOrder(tenantSlug: string, orderId: string) {
  return useQuery({
    queryKey: orderingKeys.order(orderId),
    queryFn: () =>
      apiClient.get<{ data: Order }>(`/t/${tenantSlug}/ordering/orders/${orderId}`),
    select: (res) => res.data,
    enabled: !!orderId,
    staleTime: 5000, // 5 seconds - single order updates frequently
    gcTime: 60000, // 1 minute
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

// --- Order Modification Hooks ---

interface AddItemPayload {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifiers?: Array<{ optionId: string; name: string; price: number }>;
}

/** Customer adds items to an existing order (uses customer route) */
export function useAddItemsToOrder(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: AddItemPayload[] }) =>
      apiClient.post<{ data: Order }>(
        `/order/${tenantSlug}/ordering/orders/${orderId}/items`,
        { items },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.order(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Customer requests cancellation of specific items */
export function useRequestItemCancellation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, orderItemIds }: { orderId: string; orderItemIds: string[] }) =>
      apiClient.post<{ data: Order }>(
        `/order/${tenantSlug}/ordering/orders/${orderId}/cancel-items`,
        { orderItemIds },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.order(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Staff handles cancellation request (approve/reject) */
export function useHandleCancellationRequest(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      action,
    }: {
      orderId: string;
      itemId: string;
      action: 'approve' | 'reject';
    }) =>
      apiClient.patch<{ data: Order }>(
        `/t/${tenantSlug}/ordering/orders/${orderId}/items/${itemId}`,
        { action },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Staff adds items to an existing order (uses staff route) */
export function useStaffAddItemsToOrder(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: AddItemPayload[] }) =>
      apiClient.post<{ data: Order }>(
        `/t/${tenantSlug}/ordering/orders/${orderId}/items`,
        { items },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Staff updates payment status (owner/manager only) */
export function useUpdatePaymentStatus(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) =>
      apiClient.patch<{ data: Order }>(
        `/t/${tenantSlug}/ordering/orders/${id}/payment`,
        { paymentStatus },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}
