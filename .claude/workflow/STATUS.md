# Project Status

## Current State
- **Phase:** Production v1 — multi-restaurant platform
- **Last verified:** 2026-04-12
- **Live at:** https://cv.rehou.games/nexus/
- **Commits:** 95+ | **Lines:** ~55,000 | **Tests:** 203 (181 API + 22 web)

## Features

### Platform
- [x] Multi-restaurant support (one email, multiple tenants, restaurant picker)
- [x] JWT auth with role hierarchy (owner > manager > staff)
- [x] Staff management (CRUD, password reset, role editing)
- [x] 3-package monorepo (api + web + shared)
- [x] 16-table SQLite schema with performance indexes
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
- [x] Order lifecycle (pending → confirmed → preparing → ready → delivered)
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
- [x] Allergen filter UI (customer can avoid allergens — legal requirement)
- [x] Orders list pagination (50 per page, staff dashboard)
- [x] CSV export (orders + revenue, Analytics page)
- [x] Table status management (free/occupied/needs_cleaning grid)
- [x] Waiter call button (customer notifies staff, staff acknowledges)
- [x] Analytics date range — Top Items wired to date picker
- [x] EOD daily summary report with print button
- [x] Automated SQLite backup scripts (db:backup / db:restore)

### Quality
- [x] 203 tests (181 API + 22 web)
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
