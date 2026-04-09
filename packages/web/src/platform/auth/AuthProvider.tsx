import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

export interface TenantAccess {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthContextValue {
  user: StaffUser | null;
  token: string | null;
  isAuthenticated: boolean;
  tenants: TenantAccess[];
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  register: (
    name: string,
    slug: string,
    email: string,
    password: string,
  ) => Promise<void>;
  fetchMyTenants: (email: string, password: string) => Promise<TenantAccess[]>;
  switchTenant: (targetSlug: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'nexus_token';
const USER_KEY = 'nexus_user';
const TENANTS_KEY = 'nexus_tenants';

interface AuthApiResponse {
  token: string;
  user: { id: string; email: string; name: string; role: string };
  tenant: { id: string; name: string; slug: string };
}

interface MyTenantsResponse {
  data: TenantAccess[];
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<StaffUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as StaffUser;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [tenants, setTenants] = useState<TenantAccess[]>(() => {
    const stored = localStorage.getItem(TENANTS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as TenantAccess[];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (tenants.length > 0) {
      localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
    } else {
      localStorage.removeItem(TENANTS_KEY);
    }
  }, [tenants]);

  const fetchMyTenants = useCallback(
    async (email: string, password: string): Promise<TenantAccess[]> => {
      const response = await apiClient.post<MyTenantsResponse>(
        '/platform/auth/my-tenants',
        { email, password },
      );
      setTenants(response.data);
      return response.data;
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string, tenantSlug: string) => {
      const response = await apiClient.post<AuthApiResponse>(
        '/platform/auth/login',
        { email, password, tenantSlug },
      );
      const staffUser: StaffUser = {
        ...response.user,
        tenantId: response.tenant.id,
        tenantSlug: response.tenant.slug,
      };
      setToken(response.token);
      setUser(staffUser);
    },
    [],
  );

  const register = useCallback(
    async (
      name: string,
      slug: string,
      email: string,
      password: string,
    ) => {
      const response = await apiClient.post<AuthApiResponse>(
        '/platform/auth/register',
        { name, slug, email, password },
      );
      const staffUser: StaffUser = {
        ...response.user,
        tenantId: response.tenant.id,
        tenantSlug: response.tenant.slug,
      };
      setToken(response.token);
      setUser(staffUser);

      // After registering, update the tenants list to include the new tenant
      setTenants((prev) => {
        const exists = prev.some((t) => t.id === response.tenant.id);
        if (exists) return prev;
        return [...prev, { ...response.tenant, role: response.user.role }];
      });
    },
    [],
  );

  const queryClient = useQueryClient();

  const switchTenant = useCallback(
    async (targetSlug: string) => {
      const response = await apiClient.post<AuthApiResponse>(
        '/platform/auth/switch-tenant',
        { targetSlug },
      );
      const staffUser: StaffUser = {
        ...response.user,
        tenantId: response.tenant.id,
        tenantSlug: response.tenant.slug,
      };
      setToken(response.token);
      setUser(staffUser);
      // Clear cached queries so new tenant data is fetched fresh
      queryClient.clear();
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setTenants([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TENANTS_KEY);
    queryClient.clear();
  }, [queryClient]);

  const isAuthenticated = token !== null && user !== null;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, tenants, login, register, fetchMyTenants, switchTenant, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
