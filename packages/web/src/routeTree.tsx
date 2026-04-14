import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PlatformShell } from '@web/platform/layout/PlatformShell';
import { CustomerShell } from '@web/platform/layout/CustomerShell';
import { TenantProvider, useTenant } from '@web/platform/tenant/TenantProvider';
import { TourProvider } from '@web/platform/TourProvider';
import { AuthGuard } from '@web/platform/auth/AuthGuard';
import { LocaleProvider } from '@web/platform/LocaleProvider';
import { SUPPORTED_LOCALES, useT, type Locale } from '@web/lib/i18n';

// Lazy-loaded page components — each becomes its own chunk
const LoginPage = lazy(() => import('@web/platform/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const MenuManagement = lazy(() => import('@web/apps/ordering/merchant/MenuManagement').then(m => ({ default: m.MenuManagement })));
const ModifierManager = lazy(() => import('@web/apps/ordering/merchant/ModifierManager').then(m => ({ default: m.ModifierManager })));
const OrderDashboard = lazy(() => import('@web/apps/ordering/merchant/OrderDashboard').then(m => ({ default: m.OrderDashboard })));
const PromotionManager = lazy(() => import('@web/apps/ordering/merchant/PromotionManager').then(m => ({ default: m.PromotionManager })));
const QRCodes = lazy(() => import('@web/apps/ordering/merchant/QRCodes').then(m => ({ default: m.QRCodes })));
const ComboManager = lazy(() => import('@web/apps/ordering/merchant/ComboManager').then(m => ({ default: m.ComboManager })));
const ThemeSettings = lazy(() => import('@web/apps/ordering/merchant/ThemeSettings').then(m => ({ default: m.ThemeSettings })));
const KitchenDisplay = lazy(() => import('@web/apps/ordering/merchant/KitchenDisplay').then(m => ({ default: m.KitchenDisplay })));
const Analytics = lazy(() => import('@web/apps/ordering/merchant/Analytics').then(m => ({ default: m.Analytics })));
const StaffManagement = lazy(() => import('@web/apps/ordering/merchant/StaffManagement').then(m => ({ default: m.StaffManagement })));
const TranslationsDashboard = lazy(() => import('@web/apps/ordering/merchant/TranslationsDashboard').then(m => ({ default: m.TranslationsDashboard })));
const CustomerApp = lazy(() => import('@web/apps/ordering/customer/CustomerApp').then(m => ({ default: m.CustomerApp })));
const TenantPicker = lazy(() => import('@web/platform/auth/TenantPicker').then(m => ({ default: m.TenantPicker })));

// Suspense wrapper for lazy-loaded route components
function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>{children}</Suspense>;
}

// Register mini-app modules (triggers side-effect registration)
import '@web/apps/ordering/index';

import { ErrorBoundary } from '@web/components/patterns/ErrorBoundary';

// Root route — wrapped with ErrorBoundary to catch render crashes
function RootLayout() {
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

// Login route — wrapped with LocaleProvider for i18n (uses browser detection, no tenant default)
function LoginPageWithLocale() {
  return (
    <LocaleProvider>
      <SuspenseWrap><LoginPage /></SuspenseWrap>
    </LocaleProvider>
  );
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPageWithLocale,
});

// Index route — redirect to login
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/login' });
  },
});

// Inner wrapper that reads tenant locale (must be inside TenantProvider)
function StaffLocaleShell() {
  const { tenant } = useTenant();
  const settings = tenant?.settings ? (typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings) : {};
  const primaryLocale = SUPPORTED_LOCALES.includes(settings?.primaryLocale as Locale) ? settings.primaryLocale as Locale : undefined;

  return (
    <LocaleProvider defaultLocale={primaryLocale}>
      <TourProvider tenantSlug={tenant?.slug ?? ''}>
        <PlatformShell />
      </TourProvider>
    </LocaleProvider>
  );
}

// Wrapper component for staff tenant routes
function StaffTenantLayout() {
  const { tenantSlug } = tenantRoute.useParams();
  return (
    <AuthGuard tenantSlug={tenantSlug}>
      <TenantProvider tenantSlug={tenantSlug}>
        <StaffLocaleShell />
      </TenantProvider>
    </AuthGuard>
  );
}

// Staff tenant routes — requires auth
const tenantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/t/$tenantSlug',
  component: StaffTenantLayout,
});

// Staff tenant index — redirect to orders dashboard
const tenantIndexRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/t/$tenantSlug/ordering/orders', params });
  },
});

// --- Ordering module routes ---
const orderingMenuRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/menu',
  validateSearch: (search: Record<string, unknown>) => ({
    openItem: typeof search.openItem === 'string' ? search.openItem : undefined,
  }),
  component: () => <SuspenseWrap><MenuManagement /></SuspenseWrap>,
});

const orderingOrdersRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/orders',
  component: () => <SuspenseWrap><OrderDashboard /></SuspenseWrap>,
});

const orderingModifiersRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/modifiers',
  component: () => <SuspenseWrap><ModifierManager /></SuspenseWrap>,
});

const orderingPromotionsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/promotions',
  component: () => <SuspenseWrap><PromotionManager /></SuspenseWrap>,
});

const orderingCombosRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/combos',
  component: () => <SuspenseWrap><ComboManager /></SuspenseWrap>,
});

const orderingQRRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/qr',
  component: () => <SuspenseWrap><QRCodes /></SuspenseWrap>,
});

const orderingSettingsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/settings',
  component: () => <SuspenseWrap><ThemeSettings /></SuspenseWrap>,
});

const orderingAnalyticsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/analytics',
  component: () => <SuspenseWrap><Analytics /></SuspenseWrap>,
});

const orderingStaffRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/staff',
  component: () => <SuspenseWrap><StaffManagement /></SuspenseWrap>,
});

const orderingTranslationsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/translations',
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
  component: () => <SuspenseWrap><TranslationsDashboard /></SuspenseWrap>,
});

// Restaurant switcher route
const restaurantsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/restaurants',
  component: () => <SuspenseWrap><TenantPicker /></SuspenseWrap>,
});

// Staff tenant catch-all for unknown module routes
const tenantCatchAllRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '$',
  component: TenantNotFound,
});

// --- Kitchen Display route (full-screen, no PlatformShell) ---
function KitchenLocaleShell() {
  const { tenant } = useTenant();
  const settings = tenant?.settings ? (typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings) : {};
  const primaryLocale = SUPPORTED_LOCALES.includes(settings?.primaryLocale as Locale) ? settings.primaryLocale as Locale : undefined;
  return (
    <LocaleProvider defaultLocale={primaryLocale}>
      <SuspenseWrap><KitchenDisplay /></SuspenseWrap>
    </LocaleProvider>
  );
}

function KitchenLayout() {
  const { tenantSlug } = kitchenRoute.useParams();
  return (
    <AuthGuard tenantSlug={tenantSlug}>
      <TenantProvider tenantSlug={tenantSlug}>
        <KitchenLocaleShell />
      </TenantProvider>
    </AuthGuard>
  );
}

const kitchenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/t/$tenantSlug/ordering/kitchen',
  component: KitchenLayout,
});

// Wrapper component for customer order routes
function CustomerOrderLayout() {
  const { tenantSlug } = customerRoute.useParams();
  return (
    <TenantProvider tenantSlug={tenantSlug}>
      <TourProvider>
        <CustomerShell />
      </TourProvider>
    </TenantProvider>
  );
}

// Customer order routes — no auth required
const customerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/order/$tenantSlug',
  component: CustomerOrderLayout,
});

// Customer index route — renders the ordering app
function CustomerIndex() {
  const { tenantSlug } = customerRoute.useParams();
  return <CustomerApp tenantSlug={tenantSlug} />;
}

const customerIndexRoute = createRoute({
  getParentRoute: () => customerRoute,
  path: '/',
  component: CustomerIndex,
});

// Customer catch-all — also renders ordering app
function CustomerCatchAll() {
  const { tenantSlug } = customerRoute.useParams();
  return <CustomerApp tenantSlug={tenantSlug} />;
}

const customerCatchAllRoute = createRoute({
  getParentRoute: () => customerRoute,
  path: '$',
  component: CustomerCatchAll,
});

// Placeholder components
function TenantNotFound() {
  const t = useT();
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-text-secondary">{t('Page not found')}</p>
    </div>
  );
}

// Route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  kitchenRoute,
  tenantRoute.addChildren([
    tenantIndexRoute,
    restaurantsRoute,
    orderingMenuRoute,
    orderingModifiersRoute,
    orderingOrdersRoute,
    orderingPromotionsRoute,
    orderingCombosRoute,
    orderingQRRoute,
    orderingSettingsRoute,
    orderingAnalyticsRoute,
    orderingStaffRoute,
    orderingTranslationsRoute,
    tenantCatchAllRoute,
  ]),
  customerRoute.addChildren([customerIndexRoute, customerCatchAllRoute]),
]);

// Router
// Vite sets BASE_URL from --base flag ("/nexus/" in prod, "/" in dev)
const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
export const router = createRouter({ routeTree, basepath });

// Type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
