# Platform Architecture Rules

## Core Concepts

Nexus is a multi-tenant mini-app platform. The platform provides authentication, tenant isolation,
layout shell, and a module registry. Mini-apps (modules) plug into the platform and get tenant
context, routing, and shared UI for free.

## Package Boundary

```
nexus/
  packages/api/    <- Hono HTTP server, Drizzle ORM, SQLite
  packages/web/    <- React SPA, Vite, Tailwind v4
```

These two packages NEVER import from each other directly. They communicate via HTTP (REST API).

## Backend Architecture (packages/api/src/)

### Module Pattern

Every mini-app backend lives in `modules/{name}/` with exactly three files:

```
modules/ordering/
  routes.ts    <- Hono sub-router, mounted via app.route()
  service.ts   <- Business logic layer (pure functions + DB queries)
  schema.ts    <- Drizzle table definitions for this module
```

Rules:
- Routes MUST NOT contain business logic — delegate to service.ts
- Services MUST NOT access `c.req` or Hono context — receive typed params
- Schema files define ONLY tables for that module
- Each module mounts its router in `packages/api/src/index.ts`

### Hono Router Mounting

```typescript
// Tenant-scoped routes: all modules under /api/t/:tenantSlug
const tenantApp = new Hono<TenantEnv>();
tenantApp.use('*', tenantMiddleware(db));
tenantApp.route('/ordering', orderingRoutes(db));
// Future: tenantApp.route('/erp', erpRoutes(db));

app.route('/api/t/:tenantSlug', tenantApp);
```

### Service Layer Pattern

```typescript
// GOOD: service receives typed params
export function getMenuItems(db: DrizzleDB, tenantId: string, categoryId?: string) {
  return db.select().from(menuItems).where(eq(menuItems.tenantId, tenantId));
}

// BAD: service accesses Hono context
export function getMenuItems(c: Context) {
  const tenantId = c.var.tenantId; // NO — couples service to Hono
}
```

### Middleware (packages/api/src/middleware/)

- `auth.ts` — validates JWT, sets `c.var.user`
- `tenant.ts` — resolves tenant from URL slug, sets `c.var.tenant`
- `session.ts` — customer cookie session management

Every module route MUST use the tenant middleware. The tenant context is the
primary isolation boundary — all module queries MUST filter by tenantId.

## Frontend Architecture (packages/web/src/)

### Platform Shell (packages/web/src/platform/)

The platform provides:
- `AuthProvider` — login state, session, user info
- `TenantProvider` — active tenant, tenant switching
- `ThemeProvider` — design tokens, dark/light mode
- `registry.ts` — module registration (routes, nav items, permissions)
- `layout/` — PlatformShell (sidebar + topbar), CustomerShell

### Mini-App Frontend Modules (packages/web/src/apps/)

Each mini-app lives in `apps/{name}/` and may have sub-audiences:

```
apps/ordering/
  merchant/     <- staff-facing views (menu management, order dashboard)
  customer/     <- customer-facing views (browse menu, place order)
  hooks/        <- shared hooks for this module
  types.ts      <- module-specific types
  index.ts      <- module registration
```

Rules:
- Apps CANNOT import from other apps — see import-boundaries.md
- Apps CAN import from `platform/`, `components/ui/`, `components/patterns/`
- Each app exports a MiniAppDefinition from `index.ts`
- App routes are lazy-loaded

## Tenant Isolation Checklist

For every new feature, verify:
1. All DB queries filter by `tenantId`
2. API routes use tenant middleware
3. Frontend reads tenant from `useTenant()` hook, never hardcoded
4. No cross-tenant data leakage in list/detail views
5. Tenant ID included in all mutation payloads (or derived from middleware)
