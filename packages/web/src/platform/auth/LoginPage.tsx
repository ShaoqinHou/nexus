import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth, type TenantAccess } from '@web/platform/auth/AuthProvider';
import { Button, Input, Badge, LanguagePicker } from '@web/components/ui';
import { Building2, ArrowLeft } from 'lucide-react';
import { useT } from '@web/lib/i18n';

export function LoginPage() {
  const t = useT();
  const { login, register, fetchMyTenants } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Multi-tenant picker state
  const [tenantList, setTenantList] = useState<TenantAccess[] | null>(null);
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [resolvedPassword, setResolvedPassword] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Default to demo credentials if empty
    const em = email || 'demo@example.com';
    const pw = password || 'password123';

    try {
      if (mode === 'register') {
        const slug = tenantSlug || 'demo';
        await register(tenantName, slug, em, pw);
        navigate({ to: '/t/$tenantSlug/ordering/orders', params: { tenantSlug: slug } });
        return;
      }

      // Login mode: first check how many tenants the user has access to
      const tenants = await fetchMyTenants(em, pw);

      if (tenants.length === 0) {
        setError(t('No restaurants found for this account'));
      } else if (tenants.length === 1) {
        // Single tenant: auto-login directly
        await login(em, pw, tenants[0].slug);
        navigate({ to: '/t/$tenantSlug/ordering/orders', params: { tenantSlug: tenants[0].slug } });
      } else {
        // Multiple tenants: show picker
        setResolvedEmail(em);
        setResolvedPassword(pw);
        setTenantList(tenants);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenant: TenantAccess) => {
    setError('');
    setLoading(true);
    try {
      await login(resolvedEmail, resolvedPassword, tenant.slug);
      navigate({ to: '/t/$tenantSlug/ordering/orders', params: { tenantSlug: tenant.slug } });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setTenantList(null);
    setResolvedEmail('');
    setResolvedPassword('');
    setError('');
  };

  // Tenant picker view
  if (tenantList !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text">{t('Choose Restaurant')}</h1>
            <p className="text-sm text-text-secondary mt-1">
              {t('You have access to')} {tenantList.length} {t('restaurants')}
            </p>
          </div>

          <div className="bg-bg-elevated border border-border rounded-lg p-6 shadow-md space-y-3">
            {error && (
              <div className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            {tenantList.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => handleTenantSelect(tenant)}
                disabled={loading}
                className="w-full flex items-center gap-3 rounded-lg border border-border px-4 py-3 min-h-[64px] text-left transition-colors hover:bg-bg-muted hover:border-primary/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
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
                <Badge variant={tenant.role === 'owner' ? 'success' : 'default'}>
                  {tenant.role}
                </Badge>
              </button>
            ))}

            <div className="pt-2 border-t border-border mt-4">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center gap-2 px-3 py-2 min-h-[var(--hit-sm)] text-sm text-text-secondary hover:text-text hover:bg-bg-muted rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('Back to login')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguagePicker />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text">Nexus</h1>
          <p className="text-sm text-text-secondary mt-1">
            {mode === 'login'
              ? t('Sign in to your account')
              : t('Create a new restaurant')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-elevated border border-border rounded-lg p-6 shadow-md space-y-4"
        >
          {error && (
            <div className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <>
              <Input
                label={t('Restaurant Name')}
                placeholder={t('My Restaurant')}
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />
              <Input
                label={t('Restaurant ID')}
                placeholder="my-restaurant"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                helperText={t('Lowercase letters, numbers, and hyphens only')}
                required
              />
            </>
          )}

          <Input
            label={t('Email')}
            type="email"
            placeholder="demo@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label={t('Password')}
            type="password"
            placeholder="password123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            {mode === 'login' ? t('Sign In') : t('Create Restaurant')}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="px-3 py-2 min-h-[var(--hit-sm)] text-sm text-primary hover:text-primary-hover hover:bg-primary-light rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              {mode === 'login'
                ? t("Don't have an account? Register")
                : t('Already have an account? Sign in')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
