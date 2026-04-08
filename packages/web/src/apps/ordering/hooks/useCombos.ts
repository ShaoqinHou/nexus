import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';
import type { ComboDeal } from '../types';

export function useCombos(tenantSlug: string) {
  return useQuery({
    queryKey: orderingKeys.combos(),
    queryFn: () =>
      apiClient.get<{ data: ComboDeal[] }>(
        `/t/${tenantSlug}/ordering/combos`,
      ),
    select: (res) => res.data,
  });
}

interface CreateComboPayload {
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  categoryId?: string;
  slots: Array<{
    name: string;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      menuItemId: string;
      priceModifier: number;
      isDefault: number;
    }>;
  }>;
}

export function useCreateComboDeal(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateComboPayload) =>
      apiClient.post<{ data: ComboDeal }>(
        `/t/${tenantSlug}/ordering/combos`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.combos() });
    },
  });
}

interface UpdateComboPayload {
  id: string;
  name?: string;
  description?: string | null;
  basePrice?: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  isActive?: number;
}

export function useUpdateComboDeal(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateComboPayload) =>
      apiClient.put<{ data: ComboDeal }>(
        `/t/${tenantSlug}/ordering/combos/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.combos() });
    },
  });
}

export function useDeleteComboDeal(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/t/${tenantSlug}/ordering/combos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.combos() });
    },
  });
}
