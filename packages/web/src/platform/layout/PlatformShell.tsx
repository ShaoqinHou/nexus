import { useState, useCallback } from 'react';
import { Outlet, Link, useParams, useLocation } from '@tanstack/react-router';
import {
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  LayoutDashboard,
  ArrowLeftRight,
} from 'lucide-react';
import { useAuth } from '@web/platform/auth/AuthProvider';
import { useTheme } from '@web/platform/theme/ThemeProvider';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { getApps } from '@web/platform/registry';
import { Button } from '@web/components/ui';

export function PlatformShell() {
  const { user, logout, tenants } = useAuth();
  const hasMultipleTenants = tenants.length > 1;
  const { theme, toggleTheme } = useTheme();
  const { tenant } = useTenant();
  const { tenantSlug } = useParams({ strict: false }) as { tenantSlug: string };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const apps = getApps();
  const location = useLocation();

  const closeMobileSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const navItems = apps.flatMap((app) =>
    app.navItems.map((item) => ({
      ...item,
      path: `/t/${tenantSlug}/${app.basePath}${item.path}`,
      appIcon: app.icon,
    })),
  );

  return (
    <div className="flex h-screen bg-bg">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        data-platform-shell
        className={[
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-bg-elevated border-r border-border transition-all duration-200 print:hidden',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-16' : 'w-64',
        ].join(' ')}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-text truncate">
              {tenant?.name ?? 'Nexus'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
          >
            <ChevronLeft
              className={[
                'h-5 w-5 transition-transform',
                sidebarCollapsed ? 'rotate-180' : '',
              ].join(' ')}
            />
          </button>
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="lg:hidden p-1.5 rounded-md text-text-tertiary hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <Link
            to="/t/$tenantSlug"
            params={{ tenantSlug }}
            className={[
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1',
              location.pathname === `/t/${tenantSlug}`
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text-secondary hover:text-text hover:bg-bg-muted',
            ].join(' ')}
            onClick={closeMobileSidebar}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </Link>

          {hasMultipleTenants && (
            <Link
              to="/t/$tenantSlug/restaurants"
              params={{ tenantSlug }}
              className={[
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1',
                location.pathname === `/t/${tenantSlug}/restaurants`
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-text-secondary hover:text-text hover:bg-bg-muted',
              ].join(' ')}
              onClick={closeMobileSidebar}
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>Switch Restaurant</span>}
            </Link>
          )}

          {(() => {
            const navGroups = [
              { label: 'Operations', items: navItems.filter((i) => ['/orders', '/kitchen'].some((p) => i.path.includes(p))) },
              { label: 'Menu', items: navItems.filter((i) => ['/menu', '/combos', '/modifiers'].some((p) => i.path.includes(p))) },
              { label: 'Marketing', items: navItems.filter((i) => ['/promotions', '/qr'].some((p) => i.path.includes(p))) },
              { label: 'Management', items: navItems.filter((i) => ['/analytics', '/staff', '/settings'].some((p) => i.path.includes(p))) },
            ];
            // Collect any items not matched by the groups above
            const grouped = new Set(navGroups.flatMap((g) => g.items.map((i) => i.path)));
            const ungrouped = navItems.filter((i) => !grouped.has(i.path));
            const allGroups = [
              ...navGroups,
              ...(ungrouped.length > 0 ? [{ label: 'Other', items: ungrouped }] : []),
            ];

            return allGroups.filter((g) => g.items.length > 0).map((group) => (
              <div key={group.label} className="mb-3">
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-3 mb-1">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActiveNav = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1',
                        isActiveNav
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-text-secondary hover:text-text hover:bg-bg-muted',
                      ].join(' ')}
                      onClick={closeMobileSidebar}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ));
          })()}
        </nav>

        {/* Sidebar footer */}
        {!sidebarCollapsed && user && (
          <div className="border-t border-border p-4">
            <div className="text-sm font-medium text-text truncate">
              {user.name}
            </div>
            <div className="text-xs text-text-tertiary truncate">
              {user.email}
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-4 border-b border-border bg-bg-elevated print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-text truncate">
              {tenant?.name ?? tenantSlug}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
