# Project Status

## Current State
- **Phase:** Production v2 — restaurant operations + i18n + performance + Claude Design system v1
- **Last verified:** 2026-04-14 (pre v2 design work)
- **Active branch:** `feat/design-workflow-v2` (in review)
- **Live at:** https://cv.rehou.games/nexus/
- **Commits:** 135+ on main; 14 on feat/design-workflow-v2
- **Lines:** 33,368 | **Components:** 53 | **API routes:** 67
- **Tests:** 203 unit (181 API + 22 web) + 21 Playwright E2E + 7 smoke tests
- **Locale keys:** 688 per language (en/zh/ja/ko/fr)
- **Bundle:** 240KB main (lazy-loaded routes, vendor-split)

## Shipped: feat/design-workflow-v2 — Claude Design handoff integration (21 commits)

| Area | Status | Artifact |
|---|---|---|
| Design-reference baseline | ✓ | `design/reference/v1/` (123 files, 645K, frozen — diff future bundles against this) |
| Workflow standards | ✓ | 7 new S-* IDs in `.claude/workflow/design/standards.md` (S-DESIGN-REFERENCE, S-REGISTRY-ENTRY, S-ZOO-PAGE, S-HIT-TARGET-TOKEN, S-LUCIDE-ONLY, S-DIETARY-SPRITE, S-THEMED-COMPONENT) |
| Reviewer + Fixer updated | ✓ | New scope patterns, dispute examples, 11-item priority list, dedicated design-system fix protocol |
| Trap registry | ✓ | 9 new traps in `nexus/CLAUDE.md` |
| Design-token linter | ✓ | `.claude/scripts/check-design-tokens.mjs` — 5 rule kinds, accepts `// lint-override` and `/* lint-override */` escape hatches; 0 violations across 88 files |
| Hit-target tokens | ✓ | `--hit-sm/md/lg` in tokens.css, Button retrofitted, 153 hardcoded-px violations swept across 23 files |
| Self-hosted fonts | ✓ | Inter + JetBrains Mono woff2 in `packages/web/public/fonts/` + `@font-face` |
| Dietary-icons sprite | ✓ | `/dietary-icons.svg` — 30 symbols (5 diets, 7 free-from, 8 contains-warnings, 3 spice levels, 7 promo/meta) |
| DietaryIcon primitive | ✓ | `components/ui/DietaryIcon.tsx`, typed union of 30 names; wired in customer MenuBrowse + ItemDetailSheet |
| Dietary helpers | ✓ | `lib/dietary.ts` — `dietaryIconName()`, `allergenIconName()`, `dietaryTagColor()` |
| 10 cuisine themes | ✓ | `platform/theme/themes/*.css` + aggregator + Google Fonts (Fraunces, Noto Serif/Sans SC) |
| ThemeProvider extension | ✓ | themeId context + data-theme on `<html>` + brandColor inline-style override; CustomerShell reads `tenant.settings.theme` + `brandColor` |
| Tenant settings schema | ✓ | `tenant.settings.theme` field added to TenantThemeSettings + Zod schema |
| Component registry | ✓ | `components/registry.json` — 12 primitives + 12 patterns (8 base + 4 themed) |
| Zoo (/design/*) | ✓ | `routes/__design/Zoo.tsx`, dev-only, **24 of 24 showcases wired** (12 primitives + 8 patterns + 4 themed + tokens + themes) |
| Themed components | ✓ | NEW patterns/themed/{OrderTracker, Receipt, PromoCard, CheckoutSummary} (auto-reskin via data-theme) |
| Hex/rgba sweep | ✓ | 63 residual lint-overrides applied to legitimate domain-logic uses (palette math, print windows, keyframes, SVG fills) — 0 chrome drift |
| Test/build gates | ✓ | API 181/181 + web 22/22 + tsc web/api 0 errors + Vite build 3.5s |
| E2E verification | partial | First pass found + fixed S-DIETARY-SPRITE (commit 0dcf4ad). Re-verify pass running. |

Outstanding follow-ups (backlog, non-blocking):

- ~~`--color-kds-preparing` token pair~~ — **DONE** in commit `e93f187`
- ~~`dev:all` Windows MINGW race~~ — **DONE** via `concurrently` package in `6b3572f`
- ~~ThemeSettings.tsx merchant UI: cuisine-theme dropdown~~ — **DONE** in commit `1aa7530`
- ~~Hook resolution from worktree cwd~~ — **DONE** with WORKTREE CWD GUARD in `36b8044`
- ~~CartProvider HMR context-identity split~~ — **DONE** by extracting CartContext to leaf module in `f7b76f1`
- ~~Real cuisine-theme translations (zh/ja/ko/fr)~~ — **DONE** in `5f0473e`
- ~~ErrorBoundary i18n gap~~ — **DONE** in `b10bd3d`
- ~~DietaryIcon a11y `accessibleLabel` prop~~ — **DONE** in `d2546ea`
- ~~Unit tests for `lib/dietary.ts`, themed components, theme tenant-isolation~~ — **DONE** in `83ce187` (24 new test cases)

Remaining backlog (true follow-ups, scheduled later):

- **Self-host Fraunces + Noto Serif/Sans SC** — `themes.css` still uses `@import` from Google Fonts. Adds runtime network dep + first-paint latency. Backlog note at `.claude/workflow/scratch/font-selfhost-backlog.md`. Estimated 30 min of work; deferred because two background agents hit a sandbox wall trying to write font files into worktree paths.
- **`combo_slots.name` GLM translation** — pre-existing gap (comment in `routes.ts:680` explicitly says "Combo slots are NOT translated in this pass"). Customer combo-selection UI shows primary-language regardless of `?lang=`. Out of scope for design-workflow-v2.
- **Themed-component swap-in** — OrderTracker / Receipt / PromoCard / CheckoutSummary are NEW pattern files in `components/patterns/themed/` but NOT wired into the customer flow. Per the integration audit (a81bbc96), each has data-shape blockers vs the existing customer flow components. Plan in `.claude/workflow/scratch/themed-integration-plan.md`. Resolution order: Receipt → CheckoutSummary → PromoCard → OrderTracker.
- **"Nexus" brand string in LoginPage** — flagged by i18n audit as unwrapped. Defensibly exempt as a product name.

See `.claude/workflow/session-plan.md` for full phase-by-phase log and
commit list.

## Features

### Platform
- [x] Multi-restaurant support (one email, multiple tenants, restaurant picker)
- [x] JWT auth with role hierarchy (owner > manager > staff)
- [x] Staff management (CRUD, password reset, role editing)
- [x] 3-package monorepo (api + web + shared)
- [x] 18-table SQLite schema with performance indexes (+ feedback table)
- [x] Theming engine (6 presets, palette generation, Google Fonts)
- [x] Operating hours with enforcement + timezone display
- [x] Image upload (multipart, drag-drop, progress)
- [x] Toast notifications, responsive 3-zone desktop layout

### Ordering Module
- [x] Menu CRUD with categories, items, dietary tags, images, sort order
- [x] Modifier groups with per-item price overrides
- [x] Combo deals with customizable slots + modifier support
- [x] Promotions + promo codes (percentage/fixed, validation)
- [x] Order modifications (add items, cancel with staff approval)
- [x] Order lifecycle (pending > confirmed > preparing > ready > delivered)
- [x] Kitchen display (SSE real-time, Kanban, item checkboxes, sound alerts)
- [x] Analytics dashboard (revenue, top items, peak hours, date range filter)
- [x] QR code generator, category scroll-spy, menu search
- [x] Customer order history (localStorage)
- [x] Tax calculation (configurable rate per tenant)
- [x] Allergen declarations (per menu item)
- [x] Payment status tracking (unpaid / paid / refunded)
- [x] Receipt printing (browser print)
- [x] Onboarding tour (staff + customer)
- [x] Operating hours enforcement (block orders outside hours)
- [x] Image optimization with Sharp
- [x] Allergen filter UI (customer can avoid allergens)
- [x] Orders list pagination (50 per page, staff dashboard)
- [x] CSV export (orders + revenue, Analytics page)
- [x] Table status management (free/occupied/needs_cleaning grid)
- [x] Waiter call button (customer notifies staff, staff acknowledges)
- [x] Analytics date range - Top Items wired to date picker
- [x] EOD daily summary report with print button
- [x] Automated SQLite backup scripts (db:backup / db:restore)

### v2 Features (2026-04-12)
- [x] Payment type dropdown (cash/card/QR pay/voucher/complimentary)
- [x] Staff notes on orders (internal notes separate from customer notes)
- [x] Paid order guard (block add/cancel on paid orders)
- [x] Price override / comp (owner/manager, with audit trail)
- [x] Allergen snapshot in order items (food safety for kitchen)
- [x] KDS item completion persistence (completedAt saved to DB)
- [x] Request Bill button (customer, distinct from call waiter)
- [x] Sold-out toggle (menu items, with customer-side display)
- [x] KDS station filter (All / Kitchen / Bar / Pass views)
- [x] KDS SSE exponential backoff reconnection + audio autoplay fix
- [x] KDS kitchen ticket print button per order
- [x] Order elapsed time badges on staff dashboard
- [x] Auto table status on order events (occupied on order, needs_cleaning on delivered+paid)
- [x] Category station assignment (kitchen / bar / all)
- [x] Post-meal customer feedback (star rating + comment)
- [x] Feedback analytics tab (avg rating, breakdown, recent comments)
- [x] Join existing order landing screen (customer QR flow)
- [x] Split payment (partial payments, running totals, auto-mark-paid)
- [x] Server-side order history (session-based, survives localStorage clears)
- [x] Pre-pay tenant setting (KDS hides unpaid orders when enabled)
- [x] Customer editable item notes on existing orders
- [x] Waiter call banner: bill requests (green) vs assistance (amber)
- [x] DB backup cron (daily 3am on server)
- [x] Multi-language i18n (5 locales: en/zh/ja/ko/fr)
- [x] GLM translation service (z.ai API for menu content + notes)
- [x] Auto-translate menu items on save
- [x] Customer language picker
- [x] Locale-aware public menu API (?lang=zh)
- [x] Order notes auto-translated for kitchen staff
- [x] content_translations DB table for dynamic content
- [x] 89 customer-facing strings wrapped in t() calls

### Quality
- [x] 203 unit/integration tests (181 API + 22 web)
- [x] 15 Playwright E2E tests (cooperative multi-user scenarios)
- [x] Auth middleware tests (11 tests covering JWT validation paths)
- [x] Tax calculation tests (service + route integration)
- [x] Payment status tests (transitions + tenant isolation)
- [x] Allergen + analytics service tests
- [x] Table status + waiter call tenant isolation tests
- [x] 6 domain service modules (categories, items, modifiers, promotions, combos, orders)
- [x] Shared types + constants (@nexus/shared)
- [x] Extracted utilities + deduplicated cart logic
- [x] Multiple review cycles completed

## Demo
- Demo Restaurant: demo@example.com / password123
- Sakura Sushi: same email (multi-restaurant demo)
- Customer: /order/demo?table=1 or /order/sakura?table=1
