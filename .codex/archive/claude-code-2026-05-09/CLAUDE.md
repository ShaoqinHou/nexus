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

npm workspaces monorepo with three packages:

- **`packages/shared`** — Shared constants and types (@nexus/shared). ORDER_STATUSES, STAFF_ROLES, PROMOTION_TYPES, DIETARY_TAGS.
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
npm run db:seed          # Seed demo data (Demo Restaurant)
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

No ESLint/Stylelint/Prettier. Design-token drift is caught by a Node script:

```bash
npm run lint:design          # human-readable report
npm run lint:design:quiet    # summary only
npm run lint:design:json     # JSON for scripting
```

The script (`.claude/scripts/check-design-tokens.mjs`) scans `packages/web/src/`
for hex literals, `rgb()/rgba()` literals, Tailwind color-scale classes,
hardcoded hit-target pixels, and non-Lucide icon imports — all drift the
design-system standards ban. Exit 0 = clean, 1 = violations. Use
`// lint-override` on a line as the per-line escape hatch.

Per-PR convention: `npm run lint:design` count must be ≤ the previous
commit's count (monotone decreasing). Current baseline on `main` is
documented in `.claude/workflow/session-plan.md` Phase 4.

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
  platform/         — Shell: AuthProvider, TenantProvider, ThemeProvider, ToastProvider, layout
  apps/             — Mini-app modules (ordering/, future: loyalty/, erp/)
    ordering/
      index.ts      — Module registration
      merchant/     — Staff views (menu CRUD, order dashboard, modifier manager, QR codes)
      customer/     — Customer views (QR flow: menu → item detail → cart → order → confirmation)
      hooks/        — Query key factory, useMenu, useOrders, useModifiers
      types.ts      — Module-specific types
  components/
    ui/             — Shared primitives (Button, Badge, Card, Dialog, Input, Toggle, Select, Toast, ImageUpload)
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
- **ToastProvider** — toast notifications (success/error/info) for mutation feedback
- **CartProvider** (customer only) — `useReducer` + `sessionStorage`, supports modifiers, cleared after order

Query key factory pattern per module in `apps/{name}/hooks/keys.ts`.

### Design System

CSS custom property tokens define all visual values. Tailwind v4 maps to these tokens. **Never hardcode colors** — use token references.

Token categories: surfaces, text, borders, semantic (primary/success/warning/danger), brand (per-tenant override), typography, radius.

Dark mode via `.dark` class on root element. Per-tenant branding via runtime CSS variable overrides.

Shared components in `components/ui/` (primitives) and `components/patterns/` (reusable compositions). Import via barrel: `import { Button, Card } from '@web/components/ui'`.

### Database Schema (packages/api/src/db/)

SQLite with Drizzle ORM (16 tables). Platform: `tenants`, `staff`, `customer_sessions`. Menu: `menu_categories`, `menu_items`, `modifier_groups`, `modifier_options`, `menu_item_modifier_groups`. Commerce: `promotions`, `promo_codes`, `combo_deals`, `combo_slots`, `combo_slot_options`. Orders: `orders`, `order_items`.

Conventions:
- All business tables have `tenant_id` with FK to tenants
- Soft deletes via `is_active` boolean
- Timestamps as ISO 8601 text strings
- Status enums as `const` arrays with derived TypeScript types
- Order items snapshot name/price/modifiers at order time (price changes don't affect existing orders)

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

Key skills: `/verify` (E2E browser check), `/build` (dev commands), `/test` (testing conventions), `/new-module` (scaffold a mini-app), `/consistency-audit` (6-layer codebase audit), `/commit-review` (two-agent review loop).

## Automated Code Review

Every substantive commit is automatically reviewed by a two-agent loop. Ported from hex-empires' pattern — see `.claude/skills/commit-review/SKILL.md` for details.

**How it works:**
1. On `git commit`, the `commit-review` PostToolUse hook writes the sha to a queue and spawns a background `/commit-review --drain-queue` session.
2. The orchestrator spawns the **Reviewer** agent (`.claude/agents/reviewer.md`), which audits the diff against `.claude/workflow/design/standards.md` and produces a structured findings report at `.claude/workflow/scratch/review-<sha>.md`.
3. If the Reviewer's verdict is `FAIL` (any `severity: block` findings), the orchestrator spawns the **Fixer** agent (`.claude/agents/fixer.md`) in an isolated worktree. Fixer addresses BLOCK findings only, commits the repairs on an `auto-fix/*` branch, and writes `.claude/workflow/scratch/fix-log-<sha>.md`.
4. The orchestrator re-reviews the fix commit. If still failing after 3 iterations, the sha is marked `STALLED` in `.claude/workflow/issues.md` for human resolution.

**Standards source of truth:** `.claude/workflow/design/standards.md` enumerates every rule with a grep-driven detection recipe and a stable ID (e.g. `S-TENANT-ISOLATION`, `S-IMPORT-BOUNDARIES-APPS`). The Reviewer cites these IDs; `standards.md` is authoritative for what "correct" looks like. When you introduce a new rule, add a standard here first.

**Finding IDs are stable:** `F-<8-char-hash>` is `sha256(file + line + standard_id)`. Same violation across iterations → same ID. Lets you track "is this a recurring issue" without fuzzy matching.

**Escape hatches:**
- `Skip-Review: <reason>` trailer in a commit message → hook skips the review entirely.
- `// review-override: <reason>` on a line → Reviewer downgrades BLOCK to NOTE for that line.
- `scratch/review-pause` file present → hook queues but doesn't spawn a driver; reviews accumulate until manual `/commit-review --drain-queue`.
- `Agent worktree leaks:` drop a `.claude/worktree-sentinel` file with the expected worktree root; the `safe-commit.sh` PreToolUse hook then blocks commits from the wrong toplevel.

**Manual invocation:**
```
/commit-review                 # review HEAD
/commit-review <sha>           # review a specific commit
/commit-review --drain-queue   # process the background queue manually
/commit-review --sweep HEAD~10 # review the last 10 commits
```

## Trap Registry (recurring drift patterns — cite by name in reviews)

| Trap | Fix |
|------|-----|
| missing-tenant-filter | Add `eq(<table>.tenantId, tenantId)` to every `.where()` in the service chain |
| service-reads-hono-context | Service signatures take `(db, tenantId, …)` only. Move `c.req` / `c.var` reads up to `routes.ts` |
| routes-skip-service-layer | `db.*()` in `routes.ts` is a violation. Move to `service.ts` and call from the route handler |
| zod-missing-on-mutation | Every POST/PUT/PATCH/DELETE with a body needs `zValidator('json', schema)` before handler |
| hardcoded-hex-chrome | Raw `#RRGGBB` or `rgba()` in `apps/` or `components/` → replace with token (`var(--color-*)` or semantic Tailwind class) |
| hardcoded-pixels | `Npx` outside Tailwind arbitrary brackets → use Tailwind spacing scale (`p-4`, `h-12`) |
| hit-target-hardcoded-px | `min-h-[44px]`, `h-[48px]` → `h-[var(--hit-sm/md/lg)]` or `<Button size="sm/md/lg">` |
| tailwind-color-utility | `bg-gray-900`, `text-red-500` in apps/components → use `bg-bg-surface`, `text-danger` semantic tokens |
| useeffect-data-fetch | `useEffect(() => fetch(...))` → TanStack Query `useQuery` |
| inline-query-key | `useQuery({ queryKey: ['menu', tenantId], ... })` → `useQuery({ queryKey: orderingKeys.menu(tenantId), ... })` |
| mutation-silent | `useMutation` without `onSuccess`/`onError` toast → wire toast feedback |
| english-jsx-unwrapped | `<p>Place order</p>` → `<p>{t('Place order')}</p>` + add to all 5 locales |
| localstorage-cart | Customer cart in `localStorage` → must be `sessionStorage` via `CartProvider` |
| hard-delete-business | `db.delete(menuItems)` on business tables → soft-delete via `is_active = false` |
| order-item-no-snapshot | Order items referencing menu items by FK only → snapshot name/price/modifiers at order time |
| cross-app-import | `apps/ordering/` importing from `apps/loyalty/` → extract to `components/patterns/` |
| cross-module-import | `modules/ordering/` importing from `modules/loyalty/` → extract to `packages/api/src/lib/` |
| ui-imports-apps | `components/ui/` importing from `apps/` or `platform/` → UI primitives are domain-free |
| missing-tenant-test | New module without an A-vs-B tenant isolation test → without it, a silent filter drop goes undetected |
| design-reference-mutated | Any edit to `design/reference/v<N>/` files without a `Design-Bump:` trailer → revert, copy to new `v<N+1>/` folder instead |
| missing-registry-entry | New `components/ui/*.tsx` or `components/patterns/*.tsx` without matching entry in `components/registry.json` → add entry in same commit |
| missing-zoo-page | New primitive or pattern without `routes/__design/<name>.tsx` → add zoo page that imports from real source |
| zoo-page-inline-redef | Zoo page redefines the component inline instead of importing → replace with `import { Button } from '@web/components/ui'` |
| emoji-as-icon | Emoji or unicode glyph (`→`, `★`, `⚠`) used as an icon in JSX → swap to matching Lucide icon. Dietary markers use `<DietaryIcon>` sprite, not emoji. |
| non-lucide-icon-library | `import { X } from 'react-icons/...'` or `heroicons`/`phosphor-react` → migrate to `lucide-react`, the sole sanctioned UI icon library |
| dietary-text-only | Dietary/allergen/spice label rendered as plain text or emoji → wrap in `<DietaryIcon name="..." />` using the sprite |
| theme-flat-shapes | UI primitive uses hardcoded `rounded-md`/`rounded-full` instead of the semantic shape tokens. Use `rounded-[var(--radius-btn)]` (Button/Input), `rounded-[var(--radius-card)]` (Card), `rounded-[var(--radius-chip)]` (Badge). Each cuisine sets these differently — counter→0px, trattoria/taqueria/curry-house/bubble-tea→9999px pill, classic→md, sichuan/cantonese/izakaya→sm. Hardcoding flattens every theme to the same shape, defeating the bundle's per-cuisine identity |
| theme-preview-card-uses-active-theme | Cuisine theme PREVIEW cards in Settings render using the currently-applied theme's tokens (`text-text`, `bg-bg-elevated`, etc) instead of the TARGET theme's. Each card must be wrapped in `<div data-theme={cuisine.id}>` and use `var(--font-display)` / `var(--radius-card)` / `var(--radius-btn)` so the card itself previews its target theme — counter shows sharp brutalist, trattoria shows pill terracotta, etc — even before the user selects it |
| derived-palette-replaces-cuisine-palette | UI shows a "Derived Palette" computed from a single brand colour via `generatePalette(brand, isDark)` regardless of which cuisine is active. Each cuisine has its OWN palette identity baked into its CSS file (cinnabar+gold for sichuan, terracotta+olive for trattoria, etc). Render swatches that reference `var(--color-bg)`, `var(--color-brand)`, `var(--color-accent)`, `var(--color-text)` directly — they cascade from the active cuisine, not from a brand derivation |
| dark-theme-compound-selector | A theme CSS rule uses `[data-theme="X"].dark { … }` (compound) → won't fire when `.dark` is on `<html>` and `data-theme` is on a wrapper `<div>`. Use descendant-first form `.dark [data-theme="X"], [data-theme="X"].dark { … }` so the cascade matches both layouts |
| theme-light-only-no-dark | Cuisine theme overrides `--color-success-light` / `--color-warning-light` / `--color-danger-light` / `--color-info-light` in its base block but provides no dark counterpart → in dark mode the wrapper inherits the light tint (because the wrapper element itself wins over `html.dark`) and badges blow out. Add the canonical dark tints to every theme's `.dark [data-theme="X"]` block |
| portal-escapes-data-theme | `createPortal(child, document.body)` (Dialog, TourOverlay, toasts) renders OUTSIDE the wrapper `<div data-theme>` → portal content shows classic colours over a cuisine-themed surface. ThemeProvider mirrors data-theme + brand vars onto `document.body` so portals inherit the cascade |
| themesettings-pingpong | ThemeProvider's "sync from initialThemeId prop" `useEffect` having `themeId` in its dep array → ping-pongs against the local `setThemeId` calls used for live preview. Track previous `initialThemeId` via `useRef`, only react when the PROP actually changed (not when local state did) |
| brand-override-shadows-primary-light | Setting `--color-primary` to the raw brand hex on the wrapper means dark-mode brand overrides like `#111827` produce dark-text-on-dark-bg badges (text-primary unreadable). Use `generatePalette(brand, isDark).primary` for `--color-primary` and `palette.primaryLight` for `--color-primary-light` so the mode-aware contrast holds |
| route-layout-skips-theme-shell | A merchant route (e.g. Kitchen Display, Settings) defines its own `*Layout` and forgets to wrap children in `MerchantThemeShell` → the page escapes the cuisine cascade and renders in classic. Every merchant route layout must wrap in `MerchantThemeShell` (mirror of `CustomerShell`) |
| route-check-not-subpath-aware | `pathname.startsWith('/order/')` works under dev (`base=/`) but breaks under `/nexus/` deploy where the path is `/nexus/order/...`. Subpath-aware: derive base-relative via `import.meta.env.BASE_URL`, run the prefix check against that, AND build any redirect targets as `${base}login` so they stay inside the app |

## Agent Coordination

| Situation | Action |
|-----------|--------|
| Trivial / single-step edit | Do it yourself |
| Research spanning 5+ files | 1 Explore subagent |
| Architecture question with multiple valid approaches | 2-3 parallel agents → synthesize yourself |
| Verifying a specific claim | 1 agent with adversarial framing |
| Long mechanical work (>20 min) | Delegate to subagent to preserve context |
| Post-commit review | Automatic via commit-review hook (don't invoke manually unless needed) |

Model selection:
- **Parent session:** prefer Sonnet. Orchestration (spawning, parsing, cherry-picking) is Sonnet-grade.
- **Review/Fix subagents:** Sonnet (per their frontmatter).
- **Design subagents (if added):** Opus — real design judgment earns its keep.
- Rule of thumb: Opus only when the decision is genuinely hard and the output will be used across several phases.

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
