import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { setCurrencySymbol, currencyCodeToSymbol } from '@web/lib/format';
import type { TenantThemeSettings } from '@web/lib/theme';

export interface TenantSettings extends TenantThemeSettings {
  currency?: string;
  timezone?: string;
}

export interface Tenant {
  id?: string;
  name: string;
  slug: string;
  settings: TenantSettings;
}

export const tenantKeys = {
  all: ['tenant'] as const,
  detail: (tenantSlug: string) => [...tenantKeys.all, tenantSlug] as const,
};

interface TenantContextValue {
  tenant: Tenant | null;
  tenantSlug: string;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  tenantSlug: string;
  children: ReactNode;
}

export function TenantProvider({ tenantSlug, children }: TenantProviderProps) {
  const tenantQuery = useQuery({
    queryKey: tenantKeys.detail(tenantSlug),
    queryFn: () => apiClient.get<Tenant>(`/platform/tenants/${tenantSlug}`),
    staleTime: 300000,
  });

  // Currency is the only remaining global tenant side effect. Theme tokens flow
  // through tenant-scoped ThemeProvider wrappers so settings updates can refresh
  // the shell through the tenant query without writing theme vars to <html>.
  useEffect(() => {
    if (tenantQuery.data) {
      setCurrencySymbol(currencyCodeToSymbol(tenantQuery.data.settings?.currency));
    }
  }, [tenantQuery.data?.slug, tenantQuery.data?.settings?.currency]);

  const error = tenantQuery.error
    ? tenantQuery.error instanceof Error
      ? tenantQuery.error.message
      : 'Failed to load tenant'
    : null;

  return (
    <TenantContext.Provider
      value={{
        tenant: tenantQuery.data ?? null,
        tenantSlug,
        loading: tenantQuery.isLoading,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
