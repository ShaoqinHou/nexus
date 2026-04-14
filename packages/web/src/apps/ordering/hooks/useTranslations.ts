import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';

// --- Types ---

export type TranslationSource = 'auto' | 'manual';

export interface ItemTranslation {
  locale: string;
  field: 'name' | 'description' | string;
  value: string;
  source: TranslationSource;
}

// --- Query key helper (scoped under orderingKeys.all) ---

const translationsKey = (itemId: string) =>
  [...orderingKeys.all, 'item-translations', itemId] as const;

// --- Fetch all translations for a menu item ---

export function useItemTranslations(tenantSlug: string, itemId: string | undefined) {
  return useQuery({
    queryKey: translationsKey(itemId ?? ''),
    queryFn: () =>
      apiClient.get<{ data: { translations: ItemTranslation[] } }>(
        `/t/${tenantSlug}/ordering/menu/items/${itemId}/translations`,
      ),
    select: (res) => res.data.translations,
    enabled: !!itemId,
    staleTime: 30000,
  });
}

// --- Set manual translation (PUT) ---

export function useSetManualTranslation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      locale,
      field,
      value,
    }: {
      itemId: string;
      locale: string;
      field: 'name' | 'description';
      value: string;
    }) =>
      apiClient.put<{ data: { translation: ItemTranslation } }>(
        `/t/${tenantSlug}/ordering/menu/items/${itemId}/translations/${locale}/${field}`,
        { value },
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: translationsKey(vars.itemId) });
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}

// --- Reset translation back to auto (DELETE) ---

export function useResetTranslation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      locale,
      field,
    }: {
      itemId: string;
      locale: string;
      field: 'name' | 'description';
    }) =>
      apiClient.delete(
        `/t/${tenantSlug}/ordering/menu/items/${itemId}/translations/${locale}/${field}`,
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: translationsKey(vars.itemId) });
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}

// --- Regenerate all translations from source (POST) ---

export function useRegenerateTranslations(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      locales,
      forceAll,
    }: {
      itemId: string;
      locales?: string[];
      forceAll?: boolean;
    }) =>
      apiClient.post<{ data: { translations: ItemTranslation[] } }>(
        `/t/${tenantSlug}/ordering/menu/items/${itemId}/translations/regenerate`,
        { locales, forceAll },
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: translationsKey(vars.itemId) });
      queryClient.invalidateQueries({ queryKey: orderingKeys.itemsAll() });
    },
  });
}
