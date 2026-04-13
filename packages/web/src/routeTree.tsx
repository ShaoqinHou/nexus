import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { LoginPage } from '@web/platform/auth/LoginPage';
import { PlatformShell } from '@web/platform/layout/PlatformShell';
import { CustomerShell } from '@web/platform/layout/CustomerShell';
import { TenantProvider, useTenant } from '@web/platform/tenant/TenantProvider';
import { TourProvider } from '@web/platform/TourProvider';
import { AuthGuard } from '@web/platform/auth/AuthGuard';
import { LocaleProvider } from '@web/platform/LocaleProvider';
import { SUPPORTED_LOCALES, type Locale } from '@web/lib/i18n';
import { MenuManagement } from '@web/apps/ordering/merchant/MenuManagement';
import { ModifierManager } from '@web/apps/ordering/merchant/ModifierManager';
import { OrderDashboard } from '@web/apps/ordering/merchant/OrderDashboard';
import { PromotionManager } from '@web/apps/ordering/merchant/PromotionManager';
import { QRCodes } from '@web/apps/ordering/merchant/QRCodes';
import { ComboManager } from '@web/apps/ordering/merchant/ComboManager';
import { ThemeSettings } from '@web/apps/ordering/merchant/ThemeSettings';
import { KitchenDisplay } from '@web/apps/ordering/merchant/KitchenDisplay';
import { Analytics } from '@web/apps/ordering/merchant/Analytics';
import { StaffManagement } from '@web/apps/ordering/merchant/StaffManagement';
import { CustomerApp } from '@web/apps/ordering/customer/CustomerApp';
import { TenantPicker } from '@web/platform/auth/TenantPicker';

// Register mini-app modules (triggers side-effect registration)
import '@web/apps/ordering/index';

// Root route
const rootRoute = createRootRoute({
  component: Outlet,
});

// Login route — wrapped with LocaleProvider for i18n (uses browser detection, no tenant default)
function LoginPageWithLocale() {
  return (
    <LocaleProvider>
      <LoginPage />
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
  component: MenuManagement,
});

const orderingOrdersRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/orders',
  component: OrderDashboard,
});

const orderingModifiersRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/modifiers',
  component: ModifierManager,
});

const orderingPromotionsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/promotions',
  component: PromotionManager,
});

const orderingCombosRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/combos',
  component: ComboManager,
});

const orderingQRRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/qr',
  component: QRCodes,
});

const orderingSettingsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/settings',
  component: ThemeSettings,
});

const orderingAnalyticsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/analytics',
  component: Analytics,
});

const orderingStaffRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/ordering/staff',
  component: StaffManagement,
});

// Restaurant switcher route
const restaurantsRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '/restaurants',
  component: TenantPicker,
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
      <KitchenDisplay />
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
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-text-secondary">Page not found</p>
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
