# Project Status

## Current State
- **Phase:** Production v2 — restaurant operations + i18n
- **Last verified:** 2026-04-13
- **Live at:** https://cv.rehou.games/nexus/
- **Commits:** 115+ | **Lines:** ~64,000 | **Tests:** 203 (181 API + 22 web) + 15 Playwright E2E

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
