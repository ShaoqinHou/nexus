import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { apiClient } from '@web/lib/api';
import { setCurrencySymbol, currencyCodeToSymbol } from '@web/lib/format';
import type { TenantThemeSettings } from '@web/lib/theme';

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

  // Fetch tenant ONCE per slug change. Previously this effect's deps
  // included `theme` (light/dark mode) because applyTenantTheme needed
  // to know isDark — so every dark-mode toggle triggered a network round
  // trip plus a full re-render with loading=true, briefly flashing the
  // classic theme between unmount and re-fetch.
  //
  // Brand-color / font / radius / shadow tokens now flow through the
  // ThemeProvider wrapper (data-theme cascade + brand inline override on
  // both wrapper and document.body). The old applyTenantTheme path that
  // wrote to <html> is redundant under the new architecture — we drop it
  // entirely. Only currency remains a side-effect since it's a global
  // module-level setting (lib/format).
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
          if (data.settings) {
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
    };
  }, [tenantSlug]);

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
