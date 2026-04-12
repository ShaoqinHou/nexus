import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';
import type { Order, OrderStatus, PaymentStatus, PaymentMethod, OrderPayment } from '../types';

export interface OrdersPage {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

export function useOrders(
  tenantSlug: string,
  filters?: Record<string, string>,
  page?: number,
) {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  const currentPage = page ?? 1;
  params.set('page', String(currentPage));
  const query = params.toString();
  const path = `/t/${tenantSlug}/ordering/orders${query ? `?${query}` : ''}`;

  return useQuery({
    queryKey: orderingKeys.orders({ ...filters, page: String(currentPage) }),
    queryFn: () => apiClient.get<OrdersPage>(path),
    select: (res) => res,
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

/** Customer updates notes on a specific order item */
export function useUpdateItemNotes(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, itemId, notes }: { orderId: string; itemId: string; notes: string }) =>
      apiClient.patch<{ data: unknown }>(
        `/order/${tenantSlug}/ordering/orders/${orderId}/items/${itemId}/notes`,
        { notes },
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
    mutationFn: ({ id, paymentStatus, paymentMethod }: { id: string; paymentStatus: PaymentStatus; paymentMethod?: PaymentMethod }) =>
      apiClient.patch<{ data: Order }>(
        `/t/${tenantSlug}/ordering/orders/${id}/payment`,
        { paymentStatus, paymentMethod },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Staff updates staff notes on an order */
export function useUpdateStaffNotes(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, staffNotes }: { orderId: string; staffNotes: string }) =>
      apiClient.patch<{ data: Order }>(
        `/t/${tenantSlug}/ordering/orders/${orderId}/notes`,
        { staffNotes },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Staff adds a partial payment to an order (split payment) */
export function useAddPayment(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, amount, method, paidBy }: { orderId: string; amount: number; method: PaymentMethod; paidBy?: string }) =>
      apiClient.post<{ data: OrderPayment }>(
        `/t/${tenantSlug}/ordering/orders/${orderId}/payments`,
        { amount, method, paidBy },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.payments(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Fetch all payments for an order */
export function useOrderPayments(tenantSlug: string, orderId: string) {
  return useQuery({
    queryKey: orderingKeys.payments(orderId),
    queryFn: () =>
      apiClient.get<{ data: OrderPayment[] }>(`/t/${tenantSlug}/ordering/orders/${orderId}/payments`),
    select: (res) => res.data,
    enabled: !!orderId,
    staleTime: 5000,
    gcTime: 60000,
  });
}

/** Owner/manager removes a payment record */
export function useRemovePayment(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, paymentId }: { orderId: string; paymentId: string }) =>
      apiClient.delete<{ data: OrderPayment }>(
        `/t/${tenantSlug}/ordering/orders/${orderId}/payments/${paymentId}`,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.payments(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}

/** Owner/manager applies a discount override to an order */
export function useApplyOverride(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, amount, reason }: { orderId: string; amount: number; reason: string }) =>
      apiClient.post<{ data: Order }>(
        `/t/${tenantSlug}/ordering/orders/${orderId}/override`,
        { amount, reason },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.ordersAll() });
    },
  });
}
