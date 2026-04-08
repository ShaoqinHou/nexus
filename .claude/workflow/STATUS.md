# Project Status

## Current State
- **Phase:** Feature-complete ordering module with modifiers
- **Last verified:** 2026-04-08 (E2E browser verified, 54 tests passing, dark mode checked)
- **Active feature:** Audit fixes in progress

## Completed
- [x] .claude/ workflow configured (hooks, rules, skills)
- [x] Package structure (api + web workspaces)
- [x] Database schema (tenants, staff, sessions, ordering + modifier tables)
- [x] Auth middleware (JWT for staff)
- [x] Tenant middleware (slug -> context)
- [x] Customer session middleware (QR cookie)
- [x] Platform shell (AuthProvider, TenantProvider, ThemeProvider, ToastProvider)
- [x] Design system tokens + shared components (8 UI primitives incl. Toast, 5 patterns)
- [x] Ordering module — backend (menu CRUD, order lifecycle, modifier groups)
- [x] Ordering module — merchant frontend (menu management, order dashboard, modifier manager, QR codes)
- [x] Ordering module — customer frontend (QR flow: menu browse, item detail with modifiers, cart, order confirmation)
- [x] Toast notification system (success/error/info feedback on all mutations)
- [x] Unit + integration tests (32 API + 22 Web = 54 tests)
- [x] Seed script (demo tenant with categories, items, sample orders)
- [x] Mobile responsiveness pass (order dashboard, menu management, focus rings)
- [x] QR code generator (staff page, configurable tables, printable)
- [x] Dark mode (verified all pages, token-based colors, info tokens added)
- [x] Bug fixes (nested button, dialog reset, Toggle color, TenantProvider path, query keys, tableNumber type)
- [x] Production build verified (--base /nexus/, CORS for cv.rehou.games)
- [x] .env.example created

## Remaining
- [ ] Deploy to cv.rehou.games/nexus/ (systemd service, nginx, static files)
- [ ] Promotions system (percentage/fixed discounts, promo codes)
- [ ] Combo deals (fixed-price bundles with customizable slots)
- [ ] Dietary tags on menu items
- [ ] Item images with upload

## Workflow Improvements
- Seed script now creates demo data for quick testing
- Tests run via `npm test` (vitest, 54 tests)
- db:seed command available at root level
