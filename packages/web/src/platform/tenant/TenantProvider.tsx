import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { apiClient } from '@web/lib/api';
import { setCurrencySymbol, currencyCodeToSymbol } from '@web/lib/format';
import { applyTenantTheme, clearTenantTheme } from '@web/lib/theme';
import type { TenantThemeSettings } from '@web/lib/theme';
import { useTheme } from '@web/platform/theme/ThemeProvider';

interface TenantSettings extends TenantThemeSettings {
  currency?: string;
  timezone?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings;
}

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
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function fetchTenant() {
      setLoading(true);
      setError(null);

      try {
        const data = await apiClient.get<Tenant>(
          `/platform/tenants/${tenantSlug}`,
        );
        if (!cancelled) {
          setTenant(data);

          // Apply full tenant theme (brand color, font, radius, shadows)
          if (data.settings) {
            applyTenantTheme(data.settings as TenantThemeSettings, theme === 'dark');
            setCurrencySymbol(currencyCodeToSymbol(data.settings.currency));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load tenant',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTenant();

    return () => {
      cancelled = true;
      // Reset all tenant theme overrides on unmount
      clearTenantTheme();
    };
  }, [tenantSlug, theme]);

  return (
    <TenantContext.Provider value={{ tenant, tenantSlug, loading, error }}>
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
