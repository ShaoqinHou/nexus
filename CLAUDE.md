# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Nexus is a multi-tenant mini-app platform (WeChat-like). The platform provides authentication, tenant isolation, a layout shell, and a module registry. Mini-apps plug in as modules. The first module is restaurant ordering.

**Key concepts:**
- **Multi-tenant** — each restaurant is a tenant with its own data, staff, and customers
- **Module system** — each mini-app (ordering, loyalty, ERP, etc.) is a self-contained module
- **QR ordering** — customers scan a QR code at their table, browse the menu, and order without logging in
- **Shared design system** — CSS custom property tokens propagate to all modules; change once, everything updates

## Monorepo Structure

npm workspaces monorepo with two packages:

- **`packages/api`** — Hono HTTP server (port 3001), SQLite via Drizzle ORM, multi-tenant backend
- **`packages/web`** — React SPA (Vite, port 5173), Tailwind CSS v4, TanStack Router + React Query

## Commands

```bash
# Development
npm run dev:all          # Start both API + Web
npm run dev:api          # API only (port 3001)
npm run dev:web          # Web only (port 5173)

# Build
npm run build            # Build web package (tsc + vite build)

# Database
npm run db:push          # Push schema changes (drizzle-kit)
npm run db:generate      # Generate migration
npm run db:studio        # Open Drizzle Studio
```

### Testing

```bash
npm test                                                       # Full suite (API + Web)
npm run test --workspace=packages/api                          # API tests only
npm run test --workspace=packages/web                          # Web tests only
npm run test --workspace=packages/api -- src/modules/ordering/ # Module tests
npm run test --workspace=packages/web -- src/apps/ordering/    # App tests
bash .claude/hooks/run-tests.sh                                # Full suite + marker
bash .claude/hooks/run-tests.sh --module ordering              # Module tests + marker
```

No linter/formatter config exists.

## Architecture

### Multi-Tenant Platform

Every request is scoped to a tenant. Tenant middleware resolves the tenant from the URL slug and sets `c.var.tenant`. **Every DB query MUST filter by tenant_id.**

Two auth models:
- **Staff** — JWT authentication (owner/manager/staff roles per tenant)
- **Customer** — QR code → cookie-based session (no login required), scoped to tenant + table

### Hono Router Pattern (packages/api/src/)

Modular routing with `app.route()` basepath mounting:

```
Main app
  ├── /api/platform/*           → Platform routes (auth, tenant CRUD, health)
  ├── /api/t/:tenantSlug/*      → Tenant-scoped routes (staff, with tenant middleware)
  │   └── /ordering/*           → Ordering module sub-router
  └── /api/order/:tenantSlug/*  → Customer-facing routes (QR flow, session-based)
```

**Module pattern** — every mini-app backend has exactly 3 files in `modules/{name}/`:

| File | Purpose | Rules |
|------|---------|-------|
| `routes.ts` | Hono sub-router | Validate input with Zod, delegate to service layer |
| `service.ts` | Business logic | Receive typed params (NEVER Hono context), always filter by tenantId |
| `schema.ts` | Drizzle table definitions | Every table has `tenant_id` FK |

### Frontend App Registry (packages/web/src/)

Each mini-app registers routes, nav items, and permissions via a `MiniAppDefinition` in `apps/{name}/index.ts`. The platform shell reads the registry to build the route tree and sidebar navigation. Apps are lazy-loaded.

```
packages/web/src/
  platform/         — Shell: AuthProvider, TenantProvider, ThemeProvider, layout
  apps/             — Mini-app modules (ordering/, future: loyalty/, erp/)
    ordering/
      index.ts      — Module registration
      merchant/     — Staff-facing views (menu CRUD, order dashboard)
      customer/     — Customer-facing views (QR flow: menu → cart → order)
      hooks/        — Query key factory, useMenu, useOrders
  components/
    ui/             — Shared primitives (Button, Badge, Card, Dialog, Input, Toggle, Select)
    patterns/       — Reusable patterns (DataTable, FormField, StatusBadge, EmptyState, ConfirmButton)
  lib/              — Utilities, API client
```

### Customer QR Flow

```
Scan QR → /order/{tenantSlug}?table=5
       → Browse menu (public, no session)
       → Add to cart (client-side, sessionStorage)
       → Place order → API creates session cookie + order record
       → Confirmation page (polls for status updates via React Query)
```

### State Management

- **React Query** — all server state (menu, orders, tenant data)
- **AuthProvider** — staff JWT auth state
- **TenantProvider** — active tenant context
- **ThemeProvider** — design tokens, dark/light mode
- **CartProvider** (customer only) — `useReducer` + `sessionStorage`, cleared after order

Query key factory pattern per module in `apps/{name}/hooks/keys.ts`.

### Design System

CSS custom property tokens define all visual values. Tailwind v4 maps to these tokens. **Never hardcode colors** — use token references.

Token categories: surfaces, text, borders, semantic (primary/success/warning/danger), brand (per-tenant override), typography, radius.

Dark mode via `.dark` class on root element. Per-tenant branding via runtime CSS variable overrides.

Shared components in `components/ui/` (primitives) and `components/patterns/` (reusable compositions). Import via barrel: `import { Button, Card } from '@web/components/ui'`.

### Database Schema (packages/api/src/db/)

SQLite with Drizzle ORM. Platform tables: `tenants`, `staff`, `customer_sessions`. Ordering module: `menu_categories`, `menu_items`, `orders`, `order_items`.

Conventions:
- All business tables have `tenant_id` with FK to tenants
- Soft deletes via `is_active` boolean
- Timestamps as ISO 8601 text strings
- Status enums as `const` arrays with derived TypeScript types
- Order items snapshot name/price at order time (price changes don't affect existing orders)

### Import Boundaries (STRICT)

- `apps/{a}/` CANNOT import from `apps/{b}/` — extract to shared components
- `modules/{a}/` CANNOT import from `modules/{b}/` — extract to lib
- `components/ui/` CANNOT import from `apps/` or `platform/`
- `platform/` CAN import from `components/` but NOT from `apps/`
- Backend: `routes.ts` → `service.ts` → `schema.ts` (never skip a layer)

See `.claude/rules/import-boundaries.md` for full rules with examples.

## TDD Workflow

See `.claude/workflow/CLAUDE.md` for the full 6-phase TDD process:

1. **Design** → 2. **Scaffold** → 3. **Tests (Red)** → 4. **Implement (Green)** → 5. **E2E Verify** → 6. **Review**

Bug-fix fast-path: skip phases 1-2, write regression test, fix, verify.

**Testing depth framework** (4 layers):
- L1: Unit tests — service functions, validators, pure logic
- L2: Integration — route→service→DB wiring, correct HTTP calls
- L3: Behavioral E2E — real browser interactions via chrome-devtools MCP
- L4: Output — verify generated content/artifacts are correct

Most features need **multiple layers**. "Visible in snapshot" does NOT equal "working".

Key skills: `/verify` (E2E browser check), `/build` (dev commands), `/test` (testing conventions), `/new-module` (scaffold a mini-app), `/consistency-audit` (6-layer codebase audit).

## Prerequisites

- Node.js, npm (workspaces support)
- Windows MINGW64 — use `python` not `python3`
- Use `node -e` for JSON parsing (jq may not be available)
- Prefix `MSYS_NO_PATHCONV=1` before commands with `--base /path/`

## Environment Variables

Configured via `.env` at project root:
- `DATABASE_PATH` — SQLite DB path (default: `./data/nexus.db`)
- `JWT_SECRET` — Secret for staff JWT tokens
- `PORT` — API server port (default: 3001)
