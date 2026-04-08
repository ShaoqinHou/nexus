import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import type { TenantThemeSettings } from '@web/lib/theme';

interface TenantSettings extends TenantThemeSettings {
  currency?: string;
  timezone?: string;
}

export const tenantSettingsKeys = {
  all: ['tenant-settings'] as const,
  detail: (tenantSlug: string) => [...tenantSettingsKeys.all, tenantSlug] as const,
};

export function useTenantSettings(tenantSlug: string) {
  return useQuery({
    queryKey: tenantSettingsKeys.detail(tenantSlug),
    queryFn: () =>
      apiClient.get<{ data: TenantSettings }>(
        `/t/${tenantSlug}/settings`,
      ),
    select: (res) => res.data,
  });
}

export function useUpdateTenantSettings(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<TenantSettings>) =>
      apiClient.put<{ data: TenantSettings }>(
        `/t/${tenantSlug}/settings`,
        settings,
      ),
    onSuccess: (res) => {
      queryClient.setQueryData(tenantSettingsKeys.detail(tenantSlug), res);
      // Also invalidate the tenant info query so TenantProvider picks up new theme
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantSlug] });
    },
  });
}
