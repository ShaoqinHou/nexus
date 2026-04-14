import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';

// --- Types ---

export type EntityType =
  | 'menu_item'
  | 'menu_category'
  | 'modifier_group'
  | 'modifier_option'
  | 'promotion'
  | 'combo_deal'
  | 'combo_slot';

export type TranslationSource = 'auto' | 'manual';

export interface EntityTranslation {
  locale: string;
  field: string;
  value: string;
  source: TranslationSource;
}

// --- Query key helper ---

export const entityTranslationsKey = (entityType: EntityType, entityId: string) =>
  [...orderingKeys.all, 'translations', entityType, entityId] as const;

// Map entity types to the React Query lists that may render translated fields, so
// that changing a translation refreshes the merchant lists too.
function relatedListKeys(entityType: EntityType): readonly (readonly unknown[])[] {
  switch (entityType) {
    case 'menu_item':
      return [orderingKeys.itemsAll(), orderingKeys.menu()];
    case 'menu_category':
      return [orderingKeys.categories(), orderingKeys.menu()];
    case 'modifier_group':
    case 'modifier_option':
      return [orderingKeys.modifiers(), orderingKeys.menu()];
    case 'promotion':
      return [orderingKeys.promotions()];
    case 'combo_deal':
    case 'combo_slot':
      return [orderingKeys.combos(), orderingKeys.menu()];
    default:
      return [];
  }
}

// --- Fetch all translations for an entity ---

export function useEntityTranslations(
  tenantSlug: string,
  entityType: EntityType,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: entityTranslationsKey(entityType, entityId ?? ''),
    queryFn: () =>
      apiClient.get<{ data: { translations: EntityTranslation[] } }>(
        `/t/${tenantSlug}/ordering/translations/${entityType}/${entityId}`,
      ),
    select: (res) => res.data.translations,
    enabled: !!entityId,
    staleTime: 30000,
  });
}

// --- Set manual translation (PUT) ---

export interface SetManualInput {
  entityType: EntityType;
  entityId: string;
  locale: string;
  field: string;
  value: string;
}

export function useSetManualTranslation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityType, entityId, locale, field, value }: SetManualInput) =>
      apiClient.put<{ data: { translation: EntityTranslation } }>(
        `/t/${tenantSlug}/ordering/translations/${entityType}/${entityId}/${locale}/${field}`,
        { value },
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: entityTranslationsKey(vars.entityType, vars.entityId),
      });
      for (const key of relatedListKeys(vars.entityType)) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// --- Reset translation back to AI (DELETE) ---

export interface ResetTranslationInput {
  entityType: EntityType;
  entityId: string;
  locale: string;
  field: string;
}

export function useResetTranslation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityType, entityId, locale, field }: ResetTranslationInput) =>
      apiClient.delete(
        `/t/${tenantSlug}/ordering/translations/${entityType}/${entityId}/${locale}/${field}`,
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: entityTranslationsKey(vars.entityType, vars.entityId),
      });
      for (const key of relatedListKeys(vars.entityType)) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// --- Regenerate all auto translations from source (POST) ---

export interface RegenerateInput {
  entityType: EntityType;
  entityId: string;
  locales?: string[];
  forceAll?: boolean;
}

export function useRegenerateTranslations(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityType, entityId, locales, forceAll }: RegenerateInput) =>
      apiClient.post<{ data: { translations: EntityTranslation[] } }>(
        `/t/${tenantSlug}/ordering/translations/${entityType}/${entityId}/regenerate`,
        { locales, forceAll },
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: entityTranslationsKey(vars.entityType, vars.entityId),
      });
      for (const key of relatedListKeys(vars.entityType)) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
