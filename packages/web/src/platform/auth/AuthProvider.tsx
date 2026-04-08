import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { apiClient } from '@web/lib/api';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

interface AuthContextValue {
  user: StaffUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  register: (
    name: string,
    slug: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'nexus_token';
const USER_KEY = 'nexus_user';

interface AuthApiResponse {
  token: string;
  user: { id: string; email: string; name: string; role: string };
  tenant: { id: string; name: string; slug: string };
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
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const isAuthenticated = token !== null && user !== null;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, login, register, logout }}
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
