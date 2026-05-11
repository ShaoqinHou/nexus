import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import type { TenantThemeSettings } from '@web/lib/theme';
import { tenantKeys, type Tenant } from '@web/platform/tenant/TenantProvider';

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
    staleTime: 300000, // 5 minutes - settings rarely change
    gcTime: 600000, // 10 minutes - keep settings cached longer
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
      queryClient.setQueryData<Tenant | undefined>(
        tenantKeys.detail(tenantSlug),
        (tenant) => tenant ? { ...tenant, settings: res.data } : tenant,
      );
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenantSlug) });
    },
  });
}
