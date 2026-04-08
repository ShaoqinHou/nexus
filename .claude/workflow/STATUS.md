# Project Status

## Current State
- **Phase:** Production v1 — complete ordering platform
- **Last verified:** 2026-04-09 (post-implementation review in progress)
- **Live at:** https://rehou.games/nexus/
- **Commits:** 27 | **Lines:** ~40,000 | **Tests:** 94 (72 API + 22 web)

## Completed Features

### Platform
- [x] Multi-tenant auth (JWT), tenant resolution, session management
- [x] 3-package monorepo (api + web + shared)
- [x] 15-table SQLite schema with performance indexes
- [x] 6 preset themes with palette generation engine
- [x] Theme settings UI with live preview
- [x] Operating hours with customer-side enforcement
- [x] Staff management (CRUD, role hierarchy, permissions)
- [x] Image upload (multipart, drag-drop, progress)
- [x] Toast notifications on all mutations
- [x] Responsive 3-zone desktop layout (category rail + grid + cart sidebar)

### Ordering Module
- [x] Menu CRUD (categories, items, dietary tags, images)
- [x] Modifier groups (size, toppings, spice level)
- [x] Combo deals (fixed-price bundles with slots)
- [x] Promotions + promo codes (percentage/fixed, validation)
- [x] QR code generator (dynamic URLs, print styles)
- [x] Customer QR flow (hero → popular → search → modifiers → cart → promo → order → confirmation)
- [x] Order modifications (add items, cancel items with staff approval)
- [x] Kitchen display (SSE real-time, Kanban, sound alerts, fullscreen)
- [x] Analytics dashboard (revenue, top items, peak hours, promo ROI)
- [x] Category scroll-spy (IntersectionObserver)

### Code Quality
- [x] 94 tests with tenant isolation coverage
- [x] Service layer split into 6 domain modules
- [x] Shared types + constants (@nexus/shared)
- [x] Extracted utility functions (formatPrice, parseTags, timeAgo)
- [x] Deduplicated cart logic (useCartOrder hook)
- [x] 6+ review cycles completed

## Deferred (see memory/deferred_features.md)
- Payment integration (Stripe)
- Multi-location support
- Loyalty module
- Email/SMS notifications
- Dynamic route builder
- Inventory tracking
