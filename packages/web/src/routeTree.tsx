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
import { TenantProvider } from '@web/platform/tenant/TenantProvider';
import { AuthGuard } from '@web/platform/auth/AuthGuard';
import { MenuManagement } from '@web/apps/ordering/merchant/MenuManagement';
import { ModifierManager } from '@web/apps/ordering/merchant/ModifierManager';
import { OrderDashboard } from '@web/apps/ordering/merchant/OrderDashboard';
import { PromotionManager } from '@web/apps/ordering/merchant/PromotionManager';
import { QRCodes } from '@web/apps/ordering/merchant/QRCodes';
import { ComboManager } from '@web/apps/ordering/merchant/ComboManager';
import { CustomerApp } from '@web/apps/ordering/customer/CustomerApp';

// Register mini-app modules (triggers side-effect registration)
import '@web/apps/ordering/index';

// Root route
const rootRoute = createRootRoute({
  component: Outlet,
});

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Index route — redirect to login
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/login' });
  },
});

// Wrapper component for staff tenant routes
function StaffTenantLayout() {
  const { tenantSlug } = tenantRoute.useParams();
  return (
    <AuthGuard tenantSlug={tenantSlug}>
      <TenantProvider tenantSlug={tenantSlug}>
        <PlatformShell />
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

// Staff tenant catch-all for unknown module routes
const tenantCatchAllRoute = createRoute({
  getParentRoute: () => tenantRoute,
  path: '$',
  component: TenantNotFound,
});

// Wrapper component for customer order routes
function CustomerOrderLayout() {
  const { tenantSlug } = customerRoute.useParams();
  return (
    <TenantProvider tenantSlug={tenantSlug}>
      <CustomerShell />
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
  tenantRoute.addChildren([
    tenantIndexRoute,
    orderingMenuRoute,
    orderingModifiersRoute,
    orderingOrdersRoute,
    orderingPromotionsRoute,
    orderingCombosRoute,
    orderingQRRoute,
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
