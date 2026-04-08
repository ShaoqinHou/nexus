import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { apiClient } from '@web/lib/api';

interface TenantSettings {
  brandColor?: string;
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

          // Apply brand color override if present
          if (data.settings?.brandColor) {
            document.documentElement.style.setProperty(
              '--color-brand',
              data.settings.brandColor,
            );
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
      // Reset brand color on unmount
      document.documentElement.style.removeProperty('--color-brand');
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
