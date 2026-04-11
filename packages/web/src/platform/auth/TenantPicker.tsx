import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Building2, Plus } from 'lucide-react';
import { useAuth, type TenantAccess } from '@web/platform/auth/AuthProvider';
import { Badge, Button } from '@web/components/ui';

export function TenantPicker() {
  const { tenants, switchTenant, user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTenantSelect = async (tenant: TenantAccess) => {
    if (user?.tenantSlug === tenant.slug) {
      // Already on this tenant, just navigate to its dashboard
      navigate({ to: '/t/$tenantSlug/ordering/orders', params: { tenantSlug: tenant.slug } });
      return;
    }

    setError('');
    setLoading(true);
    try {
      await switchTenant(tenant.slug);
      navigate({ to: '/t/$tenantSlug/ordering/orders', params: { tenantSlug: tenant.slug } });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to switch restaurant');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestaurant = () => {
    logout();
    navigate({ to: '/login' });
  };

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-text-secondary">No restaurants found</p>
        <Button variant="primary" onClick={handleAddRestaurant}>
          <Plus className="h-4 w-4" />
          Create Restaurant
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Your Restaurants</h1>
        <p className="text-sm text-text-secondary mt-1">
          Switch between restaurants you manage
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {tenants.map((tenant) => {
          const isCurrent = user?.tenantSlug === tenant.slug;
          return (
            <button
              key={tenant.id}
              type="button"
              onClick={() => handleTenantSelect(tenant)}
              disabled={loading}
              className={[
                'w-full flex items-center gap-3 rounded-lg border px-4 py-3 min-h-[64px] text-left transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
                isCurrent
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-bg-muted hover:border-primary/50',
              ].join(' ')}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text truncate">
                  {tenant.name}
                </div>
                <div className="text-xs text-text-tertiary truncate">
                  /{tenant.slug}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCurrent && (
                  <Badge variant="info">current</Badge>
                )}
                <Badge variant={tenant.role === 'owner' ? 'success' : 'default'}>
                  {tenant.role}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <Button variant="secondary" onClick={handleAddRestaurant}>
          <Plus className="h-4 w-4" />
          Add New Restaurant
        </Button>
      </div>
    </div>
  );
}
