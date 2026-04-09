import { type ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { useAuth } from '@web/platform/auth/AuthProvider';

interface AuthGuardProps {
  tenantSlug: string;
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
