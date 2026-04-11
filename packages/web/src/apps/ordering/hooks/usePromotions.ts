import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';
import type { Promotion } from '../types';

// --- Staff hooks ---

export function usePromotions(tenantSlug: string) {
  return useQuery({
    queryKey: orderingKeys.promotions(),
    queryFn: () =>
      apiClient.get<{ data: Promotion[] }>(
        `/t/${tenantSlug}/ordering/promotions`,
      ),
    select: (res) => res.data,
    staleTime: 60000, // 1 minute - promotions don't change often
    gcTime: 300000, // 5 minutes
  });
}

export function useCreatePromotion(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      type: 'percentage' | 'fixed_amount';
      discountValue: number;
      minOrderAmount?: number;
      applicableCategories?: string;
      startsAt: string;
      endsAt?: string;
    }) =>
      apiClient.post<{ data: Promotion }>(
        `/t/${tenantSlug}/ordering/promotions`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.promotions() });
    },
  });
}

export function useUpdatePromotion(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      description?: string | null;
      type?: 'percentage' | 'fixed_amount';
      discountValue?: number;
      minOrderAmount?: number | null;
      applicableCategories?: string | null;
      startsAt?: string;
      endsAt?: string | null;
      isActive?: number;
    }) =>
      apiClient.put<{ data: Promotion }>(
        `/t/${tenantSlug}/ordering/promotions/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.promotions() });
    },
  });
}

export function useDeletePromotion(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/t/${tenantSlug}/ordering/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.promotions() });
    },
  });
}

export function useCreatePromoCode(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      promotionId,
      code,
      usageLimit,
    }: {
      promotionId: string;
      code: string;
      usageLimit?: number;
    }) =>
      apiClient.post(
        `/t/${tenantSlug}/ordering/promotions/${promotionId}/codes`,
        { code, usageLimit },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.promotions() });
    },
  });
}

export function useDeletePromoCode(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codeId: string) =>
      apiClient.delete(`/t/${tenantSlug}/ordering/promotions/codes/${codeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.promotions() });
    },
  });
}

// --- Customer hook ---

interface ValidatePromoData {
  code: string;
  promotionName: string;
  description: string | null;
  type: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderAmount: number | null;
  applicableCategories: string[] | null;
}

export function useValidatePromoCode(tenantSlug: string) {
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await apiClient.post<{ data: ValidatePromoData }>(
        `/order/${tenantSlug}/ordering/validate-promo`,
        { code },
      );
      return res.data;
    },
  });
}
