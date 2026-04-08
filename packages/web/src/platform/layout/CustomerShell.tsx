import { Outlet } from '@tanstack/react-router';
import { useTenant } from '@web/platform/tenant/TenantProvider';

export function CustomerShell() {
  const { tenant, loading, error } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-text mb-2">
            Restaurant not found
          </h1>
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Minimal header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg-elevated/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-lg font-bold text-text">
            {tenant?.name ?? 'Menu'}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
