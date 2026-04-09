import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';
import type { ModifierGroup, ModifierOption } from '../types';

// --- Modifier Groups ---

export function useModifierGroups(tenantSlug: string) {
  return useQuery({
    queryKey: orderingKeys.modifiers(),
    queryFn: () =>
      apiClient.get<{ data: ModifierGroup[] }>(
        `/t/${tenantSlug}/ordering/modifiers`,
      ),
    select: (res) => res.data,
  });
}

export function useCreateModifierGroup(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      minSelections: number;
      maxSelections: number;
    }) =>
      apiClient.post<{ data: ModifierGroup }>(
        `/t/${tenantSlug}/ordering/modifiers`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.modifiers() });
    },
  });
}

export function useUpdateModifierGroup(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      minSelections?: number;
      maxSelections?: number;
    }) =>
      apiClient.put<{ data: ModifierGroup }>(
        `/t/${tenantSlug}/ordering/modifiers/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.modifiers() });
    },
  });
}

export function useDeleteModifierGroup(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/t/${tenantSlug}/ordering/modifiers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.modifiers() });
    },
  });
}

// --- Modifier Options ---

export function useCreateModifierOption(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      ...body
    }: {
      groupId: string;
      name: string;
      priceDelta: number;
      isDefault?: number;
    }) =>
      apiClient.post<{ data: ModifierOption }>(
        `/t/${tenantSlug}/ordering/modifiers/${groupId}/options`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.modifiers() });
    },
  });
}

export function useUpdateModifierOption(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      priceDelta?: number;
      isDefault?: number;
    }) =>
      apiClient.put<{ data: ModifierOption }>(
        `/t/${tenantSlug}/ordering/modifiers/options/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.modifiers() });
    },
  });
}

export function useDeleteModifierOption(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/t/${tenantSlug}/ordering/modifiers/options/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.modifiers() });
    },
  });
}

// --- Item <-> Modifier Group linking ---

export function useItemModifierGroups(tenantSlug: string, itemId: string) {
  return useQuery({
    queryKey: orderingKeys.itemModifiers(itemId),
    queryFn: () =>
      apiClient.get<{ data: ModifierGroup[] }>(
        `/t/${tenantSlug}/ordering/items/${itemId}/modifiers`,
      ),
    select: (res) => res.data,
    enabled: !!itemId,
  });
}

interface SetItemModifierGroupInput {
  groupId: string;
  priceOverrides?: Record<string, { priceDelta: number }>;
}

export function useSetItemModifierGroups(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      groups,
    }: {
      itemId: string;
      groups: SetItemModifierGroupInput[];
    }) =>
      apiClient.put(
        `/t/${tenantSlug}/ordering/items/${itemId}/modifiers`,
        { groups },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: orderingKeys.itemModifiers(variables.itemId),
      });
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}
