# Project Status

## Current State
- **Phase:** Production v1 — multi-restaurant platform
- **Last verified:** 2026-04-09
- **Live at:** https://rehou.games/nexus/
- **Commits:** 38 | **Lines:** ~50,000 | **Tests:** 131 (109 API + 22 web)

## Features

### Platform
- [x] Multi-restaurant support (one email, multiple tenants, restaurant picker)
- [x] JWT auth with role hierarchy (owner > manager > staff)
- [x] Staff management (CRUD, password reset, role editing)
- [x] 3-package monorepo (api + web + shared)
- [x] 15-table SQLite schema with performance indexes
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

### Quality
- [x] 131 tests (72 service + 37 route integration + 22 web)
- [x] 6 domain service modules (categories, items, modifiers, promotions, combos, orders)
- [x] Shared types + constants (@nexus/shared)
- [x] Extracted utilities + deduplicated cart logic
- [x] Multiple review cycles completed

## Demo
- Demo Restaurant: demo@example.com / password123
- Sakura Sushi: same email (multi-restaurant demo)
- Customer: /order/demo?table=1 or /order/sakura?table=1
