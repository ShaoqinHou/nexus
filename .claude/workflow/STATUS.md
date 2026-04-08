# Project Status

## Current State
- **Phase:** Production — full ordering platform with theming, kitchen display, image upload
- **Last verified:** 2026-04-09 (RPI cycle complete, 81 tests passing)
- **Live at:** https://rehou.games/nexus/

## Completed
- [x] Package structure (api + web + shared workspaces)
- [x] Database schema (15 tables: tenants, staff, sessions, menu, modifiers, promotions, combos, orders)
- [x] Auth middleware (JWT for staff), tenant middleware, customer session middleware
- [x] Platform shell (AuthProvider, TenantProvider, ThemeProvider, ToastProvider)
- [x] Design system tokens + 9 UI components (Button, Badge, Card, Dialog, Input, Toggle, Select, Toast, ImageUpload)
- [x] 5 reusable patterns (DataTable, FormField, StatusBadge, EmptyState, ConfirmButton)
- [x] Theming engine (6 presets, palette generation, Google Fonts, radius/shadow scales)
- [x] Ordering — backend (menu CRUD, modifiers, promotions, combos, order lifecycle)
- [x] Ordering — merchant (menu management, modifier manager, order dashboard, promotion manager, combo manager, QR codes, theme settings, kitchen display)
- [x] Ordering — customer (QR flow: hero header → featured items → menu browse with search → item detail with modifiers → combo customization → cart with promo codes → order confirmation with status timeline)
- [x] Responsive 3-zone desktop layout (category rail + menu grid + persistent cart sidebar)
- [x] Image upload system (multipart form, server storage, drag-drop component)
- [x] Kitchen display with SSE real-time updates (Kanban board, sound alerts, fullscreen)
- [x] Category scroll-spy (IntersectionObserver)
- [x] Operating hours display (open/closed badge)
- [x] 81 tests (59 API + 22 web) with tenant isolation coverage
- [x] Seed script with full demo data (15 items, modifiers, promotions, combos, orders)
- [x] Production deployment (systemd + nginx on rehou.games)
- [x] 4 review rounds + 1 full RPI cycle completed

## Tech Stack
- API: Hono, Drizzle ORM, SQLite, JWT, bcrypt
- Web: React 19, Vite, Tailwind CSS v4, TanStack Router/Query
- Shared: @nexus/shared (constants, types)
- Testing: Vitest, @testing-library/react, MSW
