import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@web/platform/auth/AuthProvider';
import { Button, Input } from '@web/components/ui';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password, tenantSlug);
      } else {
        await register(tenantName, tenantSlug, email, password);
      }
      navigate({ to: '/t/$tenantSlug/ordering/orders', params: { tenantSlug } });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text">Nexus</h1>
          <p className="text-sm text-text-secondary mt-1">
            {mode === 'login'
              ? 'Sign in to your tenant'
              : 'Create a new tenant'}
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
            <Input
              label="Tenant Name"
              placeholder="My Restaurant"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
          )}

          <Input
            label="Restaurant ID"
            placeholder="demo"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            helperText="The ID your restaurant was registered with"
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm text-primary hover:text-primary-hover transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
