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
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@web/platform/auth/AuthProvider';
import { useTheme } from '@web/platform/theme/ThemeProvider';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useTour } from '@web/platform/TourProvider';
import { getApps } from '@web/platform/registry';
import { Button, LanguagePicker } from '@web/components/ui';
import { useT } from '@web/lib/i18n';

export function PlatformShell() {
  const { user, logout, tenants } = useAuth();
  const hasMultipleTenants = tenants.length > 1;
  const { theme, toggleTheme } = useTheme();
  const { tenant } = useTenant();
  const { startTour } = useTour();
  const { tenantSlug } = useParams({ strict: false }) as { tenantSlug: string };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const t = useT();
  const apps = getApps();
  const location = useLocation();

  // Build available locales from tenant settings
  const tenantSettings = tenant?.settings ? (typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings) : {};
  const primaryLocale = tenantSettings?.primaryLocale || 'en';
  const additionalLocales: string[] = tenantSettings?.supportedLocales || [];
  const availableLocales = [primaryLocale, ...additionalLocales.filter((l: string) => l !== primaryLocale)];

  // Get the first available tour from registered apps
  const firstTour = apps.flatMap((app) => app.tours ?? []).at(0);

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
            className="hidden lg:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-2">
          <Link
            to="/t/$tenantSlug"
            params={{ tenantSlug }}
            className={[
              'flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors mb-1',
              location.pathname === `/t/${tenantSlug}`
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text-secondary hover:text-text hover:bg-bg-muted',
            ].join(' ')}
            onClick={closeMobileSidebar}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>{t('Dashboard')}</span>}
          </Link>

          {hasMultipleTenants && (
            <Link
              to="/t/$tenantSlug/restaurants"
              params={{ tenantSlug }}
              className={[
                'flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors mb-1',
                location.pathname === `/t/${tenantSlug}/restaurants`
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-text-secondary hover:text-text hover:bg-bg-muted',
              ].join(' ')}
              onClick={closeMobileSidebar}
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{t('Switch Restaurant')}</span>}
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
                    {t(group.label)}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActiveNav = location.pathname.startsWith(item.path);
                  // Map nav labels to data-tour attributes for the onboarding tour
                  const tourAttrMap: Record<string, string> = {
                    Menu: 'menu-link',
                    Modifiers: 'modifiers-link',
                    Kitchen: 'kitchen-link',
                    Orders: 'orders-link',
                    'QR Codes': 'qr-link',
                    Theme: 'theme-link',
                    Analytics: 'analytics-link',
                  };
                  const tourAttr = tourAttrMap[item.label];
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      {...(tourAttr ? { 'data-tour': tourAttr } : {})}
                      className={[
                        'flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors mb-1',
                        isActiveNav
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-text-secondary hover:text-text hover:bg-bg-muted',
                      ].join(' ')}
                      onClick={closeMobileSidebar}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!sidebarCollapsed && <span>{t(item.label)}</span>}
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
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-text truncate">
              {tenant?.name ?? tenantSlug}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {firstTour && (
              <button
                type="button"
                onClick={() => {
                  const onEnd = firstTour.onEnd
                    ? () => firstTour.onEnd!(tenantSlug)
                    : undefined;
                  // Silently clean up any orphaned tour items from previous runs
                  if (firstTour.onEnd) void firstTour.onEnd(tenantSlug);
                  startTour(firstTour.steps, firstTour.id, onEnd);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]"
                aria-label="Start guided tour"
                title={firstTour.label}
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            )}

            <LanguagePicker availableLocales={availableLocales} />

            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]"
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
              <span className="hidden sm:inline">{t('Logout')}</span>
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
