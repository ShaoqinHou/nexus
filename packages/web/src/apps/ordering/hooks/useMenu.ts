import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';
import type { MenuCategory, MenuItem } from '../types';

// --- Categories ---

export function useCategories(tenantSlug: string) {
  return useQuery({
    queryKey: orderingKeys.categories(),
    queryFn: () =>
      apiClient.get<{ data: MenuCategory[] }>(
        `/t/${tenantSlug}/ordering/categories`,
      ),
    select: (res) => res.data,
    staleTime: 60000, // 1 minute - categories don't change often
    gcTime: 300000, // 5 minutes
  });
}

export function useCreateCategory(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      apiClient.post<{ data: MenuCategory }>(
        `/t/${tenantSlug}/ordering/categories`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.categories() });
    },
  });
}

export function useUpdateCategory(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string; name?: string; description?: string | null; sortOrder?: number }) =>
      apiClient.put<{ data: MenuCategory }>(
        `/t/${tenantSlug}/ordering/categories/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.categories() });
    },
  });
}

export function useDeleteCategory(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/t/${tenantSlug}/ordering/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.categories() });
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}

// --- Menu Items ---

export function useMenuItems(tenantSlug: string, categoryId?: string) {
  const path = categoryId
    ? `/t/${tenantSlug}/ordering/items?categoryId=${categoryId}`
    : `/t/${tenantSlug}/ordering/items`;

  return useQuery({
    queryKey: orderingKeys.items(categoryId),
    queryFn: () => apiClient.get<{ data: MenuItem[] }>(path),
    select: (res) => res.data,
    staleTime: 60000, // 1 minute - menu items don't change often
    gcTime: 300000, // 5 minutes
  });
}

export function useCreateMenuItem(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      categoryId: string;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
      tags?: string;
      allergens?: string;
    }) => apiClient.post<{ data: MenuItem }>(`/t/${tenantSlug}/ordering/items`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}

export function useUpdateMenuItem(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      categoryId?: string;
      name?: string;
      description?: string | null;
      price?: number;
      imageUrl?: string | null;
      tags?: string | null;
      allergens?: string | null;
      isAvailable?: number;
      sortOrder?: number;
    }) => apiClient.put<{ data: MenuItem }>(`/t/${tenantSlug}/ordering/items/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}

export function useDeleteMenuItem(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/t/${tenantSlug}/ordering/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}
