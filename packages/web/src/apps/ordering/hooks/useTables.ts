import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';

export type TableStatusValue = 'free' | 'occupied' | 'needs_cleaning';

export interface TableStatusRow {
  id: string;
  tenantId: string;
  tableNumber: string;
  status: TableStatusValue;
  updatedAt: string;
}

export interface WaiterCall {
  id: string;
  tenantId: string;
  tableNumber: string;
  acknowledged: boolean;
  createdAt: string;
}

// --- Table Statuses ---

export function useTableStatuses(tenantSlug: string) {
  return useQuery({
    queryKey: orderingKeys.tableStatuses(),
    queryFn: () =>
      apiClient.get<{ data: TableStatusRow[] }>(
        `/t/${tenantSlug}/ordering/tables`,
      ),
    select: (res) => res.data,
    staleTime: 15_000,
    gcTime: 60_000,
    refetchInterval: 30_000,
  });
}

export function useUpdateTableStatus(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tableNumber,
      status,
    }: {
      tableNumber: string;
      status: TableStatusValue;
    }) =>
      apiClient.patch<{ data: TableStatusRow }>(
        `/t/${tenantSlug}/ordering/tables/${encodeURIComponent(tableNumber)}`,
        { status },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.tableStatuses() });
    },
  });
}

// --- Waiter Calls ---

export function useWaiterCalls(tenantSlug: string) {
  return useQuery({
    queryKey: orderingKeys.waiterCalls(),
    queryFn: () =>
      apiClient.get<{ data: WaiterCall[] }>(
        `/t/${tenantSlug}/ordering/waiter-calls`,
      ),
    select: (res) => res.data,
    staleTime: 0,
    gcTime: 30_000,
    refetchInterval: 15_000,
  });
}

export function useAcknowledgeWaiterCall(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) =>
      apiClient.patch<{ data: WaiterCall }>(
        `/t/${tenantSlug}/ordering/waiter-calls/${callId}/acknowledge`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.waiterCalls() });
    },
  });
}

// --- Customer: call waiter ---

export function useCallWaiter(tenantSlug: string) {
  return useMutation({
    mutationFn: (tableNumber: string) =>
      apiClient.post<{ data: WaiterCall }>(
        `/order/${tenantSlug}/ordering/call-waiter`,
        { tableNumber },
      ),
  });
}
