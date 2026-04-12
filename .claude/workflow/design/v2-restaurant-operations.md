# v2 Restaurant Operations — Master Design Document

**Status:** Planning  
**Scope:** Full feature upgrade cycle — all identified gaps + new issues from code review  
**Last updated:** 2026-04-12

---

## Executive Summary

Code review + user session surfaced 3 categories of work:
1. **Bugs / broken features** — things that exist but are wrong
2. **Missing lifecycle features** — gaps in the core ordering workflow
3. **New capabilities** — net-new features that complete the platform

Implementation is organised into 6 phases, ordered by dependency and risk.

---

## All Identified Issues + Solutions

### BUGS / BROKEN

**B1 — SSE reconnection: fixed 5s retry, 60-min hard timeout**
- Current: `new EventSource()` → on error → wait 5s → retry. No heartbeat. Hard 60-min timeout drops connection silently.
- Impact: Kitchen staff lose live updates after 1 hour without knowing it.
- Fix: Exponential backoff (5→10→20→40→60s cap). Server sends `ping` comment every 30s to reset timeout. Client shows "reconnecting…" state clearly. Remove hard 60-min limit.

**B2 — Audio alert: fails silently on strict autoplay browsers**
- Current: `new AudioContext()` created outside user gesture. Chrome/Safari may block. `<audio>` element exists but unused.
- Impact: Kitchen gets no sound on new orders in some browsers.
- Fix: Create AudioContext only inside first user click handler. Gate subsequent sounds on `audioCtx.state === 'running'`. Show "Enable Sound" banner if context is suspended.

**B3 — KDS item checkboxes not persisted**
- Current: "mark item done" checkbox is client-side React state only. Refresh = all unchecked.
- Impact: Kitchen staff lose item progress on any page reload.
- Fix: Persist item completion state to the DB. Add `completedAt: datetime | null` to `orderItems`. PATCH endpoint. KDS sends PATCH on checkbox toggle.

**B4 — Table status never auto-updates**
- Current: `table_statuses` table is fully manual — staff set free/occupied/cleaning. Orders placed and delivered have no effect on table status.
- Impact: Staff forget to update; table grid is always stale.
- Fix: On `POST /orders` → auto-set table status to `occupied`. On order `delivered` + `paid` → auto-set to `needs_cleaning`. Staff still override manually. New config: "auto table management" toggle in tenant settings.

**B5 — Cart key collision between multiple customers at same table**
- Current: sessionStorage key = `nexus_cart_{tenantSlug}_{tableNumber}`. Two phones at table 5 share the same key.
- Impact: Customer B overwrites Customer A's cart.
- Fix: Key = `nexus_cart_{tenantSlug}_{tableNumber}_{deviceId}`. `deviceId` = a UUID stored in localStorage (persists per device across sessions).

**B6 — tableNumber passed as number not string to call-waiter (FIXED)**
- Already fixed in ac41996.

---

### MISSING LIFECYCLE FEATURES

**L1 — Payment type not recorded**
- Current: Payment toggle is binary unpaid→paid. No record of HOW it was paid.
- Impact: EOD cash drawer reconciliation impossible. Analytics can't split cash vs card.
- Solution:
  - Add `paymentMethod: 'cash' | 'card' | 'qr_pay' | 'voucher' | 'complimentary' | null` to `orders` table.
  - "Mark Paid" button opens a small popover: select payment method → confirm.
  - EOD report groups by payment method.
  - "Complimentary" method = comp, sets `paymentStatus` to `paid`, `paymentMethod` to `complimentary`, no charge.

**L2 — No "Request Bill" signal distinct from general waiter call**
- Current: "Call Waiter" button sends generic call. Staff can't distinguish "need assistance" from "ready to pay."
- Solution:
  - Add `callType: 'assistance' | 'bill'` to `waiter_calls` table.
  - Customer menu: two buttons — "Call Waiter" (bell icon) and "Request Bill" (receipt icon). Both only shown when table number present.
  - Staff OrderDashboard: bill requests shown with distinct amber/green color + payment icon. Staff can click "Mark Paid" directly from the bill request banner.

**L3 — Staff notes on orders**
- Current: Customer can add notes at order time. No one can add notes after the fact.
- Solution:
  - Add `staffNotes: string | null` to `orders` table (separate from customer `notes`).
  - OrderDashboard: staff can click an edit icon on any order to add/edit staff notes. Notes visible in KDS.
  - Use case: "table is celebrating birthday", "customer has shellfish allergy not on order", "comp this order — complaint".

**L4 — Add/cancel items: paid vs unpaid guard**
- Current: Staff can add items to a `paid` order or approve cancellations on a paid order. No guard.
- Impact: Accounting errors — paid amount vs actual items mismatch.
- Solution:
  - If `paymentStatus === 'paid'`: block add-items and cancellation approval with warning. Owner/manager can override with reason logged to `staffNotes`.
  - If `paymentStatus === 'refunded'`: block all modifications (order is closed).
  - Show a "Paid — locked" badge on such orders in OrderDashboard.

**L5 — Owner/manager price override and comp**
- Current: No way to change item price or mark items as free after order placed.
- Solution:
  - Add `discountOverride: real | null` and `overrideReason: string | null` to `orders` table.
  - Manager/owner UI: "Apply Discount" action on any order card. Enter dollar amount or %. Reason required. Stored separately from promo discounts.
  - "Comp" = special case of override that sets `paymentMethod` to `complimentary` and marks paid.
  - Audit: override amount + reason + staff member ID logged.

**L6 — When to mark payment: request-bill flow**
- Current: Staff manually decide when to mark payment. No workflow signal from customer.
- Solution: See L2 (Request Bill button). Additionally:
  - New tenant setting: `paymentModel: 'pre_pay' | 'post_pay'`. Default `post_pay`.
  - `pre_pay`: order submission triggers a "payment required" state. Order doesn't go to kitchen until marked paid. (Future: Stripe integration point.)
  - `post_pay`: current behavior, customer pays when leaving.
  - For now implement `post_pay` flow improvement only (Request Bill button + staff acknowledge).

**L7 — No allergens in KDS (food safety)**
- Current: Allergens exist on menu items but are NOT snapshotted into `orderItems`. KDS has no allergen data.
- Impact: Critical food safety issue — chef has no allergen info at cook time.
- Solution:
  - Add `allergens: string | null` to `orderItems` table (comma-separated, snapshotted from menu item at order time).
  - KDS: show allergen badges prominently below item name with warning color.
  - Also add allergens to receipt print.

**L8 — Comment-only order modification**
- Current: Customers can add notes at order time only. Staff can't add notes. No post-submission note edits.
- Solution: Covered by L3 (staff notes). For customer side:
  - Allow customer to edit item `notes` on existing order items while order is still in modifiable state (pending/confirmed/preparing).
  - New endpoint: `PATCH /order/:tenantSlug/ordering/orders/:orderId/items/:itemId` with `{ notes: string }`.
  - OrderConfirmation: editable notes field per item.

---

### NEW CAPABILITIES

**N1 — Station views (Kitchen / Pass / Bar)**
- Problem: All staff share one KDS. Bar staff don't care about food orders. Pass/counter just needs "ready" items.
- Solution: URL-based station selection (no DB change needed for MVP).
  - `/merchant/kitchen?station=kitchen` — food items only (exclude drinks category)
  - `/merchant/kitchen?station=bar` — drinks category only
  - `/merchant/kitchen?station=pass` — orders in `ready` state only, compact view showing table + items
  - Station set via a settings dropdown in KDS toolbar. Persists to localStorage.
  - Menu categories tagged as "bar" or "kitchen" via category metadata (add `station: 'kitchen' | 'bar' | 'all'` to `menu_categories`).
  - KDS filters orders to only show items belonging to that station's categories.
  - Staff dashboard (OrderDashboard): "My Station" filter same way.

**N2 — Join existing order / New order choice**
- Problem: Second customer at same table sees blank menu with no context.
- Solution: On QR scan, before showing menu, check for active orders at this table:
  - `GET /order/:tenantSlug/ordering/active?table=5` — returns list of active orders at table.
  - If active orders exist: show "Table 5 has an active order" landing screen with options:
    - "Add to existing order" → goes to OrderConfirmation add-items flow
    - "Start new order" → goes to menu as normal
  - If no active orders: skip landing, go straight to menu.
  - "Active" = orders with status in `['pending','confirmed','preparing','ready']`.

**N3 — Post-meal customer feedback**
- Trigger: When order status reaches `delivered`.
- Implementation:
  - New `feedback` table: `id, tenantId, orderId, tableNumber, rating (1-5), comment (text | null), createdAt`.
  - Customer `OrderConfirmation`: when status = `delivered`, show feedback prompt (star rating + optional comment). One-time prompt, stored in localStorage to not re-prompt.
  - Staff Analytics: average rating, rating breakdown, recent comments (tab in Analytics page).
  - Endpoint: `POST /order/:tenantSlug/ordering/feedback` (public, no auth). `GET /t/:tenantSlug/ordering/feedback` (staff, paginated).

**N4 — Enhanced order history**
- Current: localStorage, 5 orders max, table-scoped, clears on storage clear.
- Solution (no customer login required):
  - Add "Email my receipt" option at OrderConfirmation — lightweight, optional. Customer enters email, receives receipt via... (deferred: no email provider setup yet). For now: generate a shareable receipt URL.
  - Order history: persist to server side via session. `GET /order/:tenantSlug/ordering/session/orders` — returns all orders for current session (24h window). Shown on QR landing if returning same-session customer.
  - Keep localStorage as fallback/cache.

**N5 — Print: kitchen ticket + customer receipt improvements**
- Current: Staff-side browser print. No auto-print. No kitchen-specific format.
- Solution:
  - Kitchen ticket print: separate print template (no prices, larger text, table+time prominent, allergens shown, "KITCHEN COPY" header). Button in KDS order card.
  - Customer receipt: add QR code to receipt linking to order status page. Add allergens to receipt.
  - Auto-print option: tenant setting to auto-open print dialog when new order arrives (opt-in, kitchen use).
  - Print from KDS: add "Print Ticket" button per order card.

**N6 — Item 86 / sold out toggle**
- Problem: No way to mark an item as unavailable in real-time. Customers can still order sold-out items.
- Solution:
  - Add `isSoldOut: boolean` to `menu_items` (default false). Different from `isActive` (active = exists on menu; soldOut = temporarily unavailable).
  - Merchant menu management: toggle "Sold Out" per item. Shown in red.
  - Customer menu: sold-out items shown with "Sold Out" badge, add-to-cart disabled.
  - API: validate items not sold out at order placement time (return 400 with item name).
  - Auto-reset option: `soldOutUntil: datetime | null` — auto-clears at that time.

**N7 — Order timer on staff dashboard**
- Current: Only KDS has order timers. Staff dashboard (OrderDashboard) has no timing.
- Solution: Add elapsed time and urgency color coding to order cards in OrderDashboard. Same logic as KDS (>15min = red, 8-15min = yellow).

**N8 — E2E test suite (Playwright, multi-browser)**
- Current: Unit + integration tests only. No multi-user cooperative scenario tests.
- Solution:
  - Add Playwright as dev dependency to `packages/web`.
  - Write cooperative scenario tests:
    - Scenario A: Customer orders → Chef sees + confirms → Customer sees status update → Chef marks ready → Staff delivers → Customer leaves feedback
    - Scenario B: Manager sets table occupied → Customer scans QR → joins existing order → Manager sees combined order → marks paid (cash)
    - Scenario C: Two customers at same table → separate carts → two separate orders → KDS shows both → staff reconciles
  - Each scenario uses 2-3 browser contexts in parallel within one Playwright test.
  - Run headless: `npx playwright test`.

---

## Implementation Phases

### Phase 1 — Fixes + Quick Wins (no schema changes)
- B2: Audio alert fix
- B1: SSE reconnection (exponential backoff + server ping)
- N7: Order timer on staff dashboard
- N5: Kitchen ticket print button in KDS

### Phase 2 — Schema extensions (additive only, no data migration)
- L7: Allergens snapshotted into orderItems (+ KDS display)
- L1: `paymentMethod` column on orders (+ payment type dropdown)
- L3: `staffNotes` column on orders (+ editable in dashboard)
- B3: `completedAt` column on orderItems (+ KDS persists checkboxes)
- L2: `callType` column on waiter_calls (+ Request Bill button)
- N6: `isSoldOut` column on menu_items (+ sold out toggle)
- N1: `station` column on menu_categories

### Phase 3 — Order lifecycle improvements (uses Phase 2 schema)
- L4: Paid order guard (block add/cancel on paid orders)
- L5: Price override / comp (owner/manager only)
- L8: Customer can edit item notes on modifiable orders
- B4: Auto table status on order events
- N2: Join existing order landing screen

### Phase 4 — Customer experience (new tables, new UI)
- N3: Post-meal feedback (new `feedback` table + UI)
- N4: Enhanced order history (session-based server-side)
- L2: Request Bill as distinct from Call Waiter (requires Phase 2)

### Phase 5 — Station views
- N1: Station-filtered KDS views (kitchen/bar/pass)
- Station selector in toolbar
- Station filter in OrderDashboard

### Phase 6 — E2E testing
- N8: Playwright setup + 3 cooperative scenario tests
- Fix any issues found during E2E

### Deferred (out of scope for this cycle)
- Fire/hold course concept (complex kitchen workflow, later)
- Stripe integration (separate initiative)
- Customer login / persistent identity (big scope)
- Email/SMS notifications (need email provider)
- Tip/gratuity (Stripe dependency)
- Multi-language
- True websocket push (would need infrastructure change)

---

## DB Schema Changes Summary

```sql
-- Phase 2 additions (all additive, no data loss)

ALTER TABLE orders ADD COLUMN payment_method TEXT; -- 'cash'|'card'|'qr_pay'|'voucher'|'complimentary'
ALTER TABLE orders ADD COLUMN staff_notes TEXT;
ALTER TABLE orders ADD COLUMN discount_override REAL;
ALTER TABLE orders ADD COLUMN override_reason TEXT;
ALTER TABLE orders ADD COLUMN override_by TEXT; -- staff ID

ALTER TABLE order_items ADD COLUMN allergens TEXT; -- comma-separated snapshot
ALTER TABLE order_items ADD COLUMN completed_at TEXT; -- ISO datetime

ALTER TABLE waiter_calls ADD COLUMN call_type TEXT DEFAULT 'assistance'; -- 'assistance'|'bill'

ALTER TABLE menu_items ADD COLUMN is_sold_out INTEGER DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN sold_out_until TEXT; -- ISO datetime

ALTER TABLE menu_categories ADD COLUMN station TEXT DEFAULT 'all'; -- 'kitchen'|'bar'|'all'

-- Phase 4 new table
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  table_number TEXT NOT NULL,
  rating INTEGER NOT NULL, -- 1-5
  comment TEXT,
  created_at TEXT NOT NULL
);
```

---

## Playwright E2E Test Architecture

Each test file opens multiple browser contexts (not pages — full isolated contexts with separate cookies/storage).

```
tests/
  e2e/
    scenario-a-order-flow.spec.ts    -- customer→kitchen→delivery cooperative flow
    scenario-b-join-order.spec.ts    -- multi-customer join existing order
    scenario-c-split-table.spec.ts   -- two parties at same table
    helpers/
      customer.ts                    -- page object: customer browser context helpers
      kitchen.ts                     -- page object: kitchen display helpers
      manager.ts                     -- page object: manager/staff dashboard helpers
```

Contexts:
- `customerCtx` — no cookies, anonymous, QR URL
- `kitchenCtx` — staff JWT, kitchen display URL
- `managerCtx` — staff JWT (owner), order dashboard URL

Tests assert cross-context interactions: e.g. customer places order → `kitchenCtx` sees it within 5 seconds.

---

## File Change Map (by phase)

### Phase 1
- `packages/web/src/apps/ordering/merchant/KitchenDisplay.tsx` — SSE reconnect + audio fix + print ticket button + order timer
- `packages/web/src/apps/ordering/merchant/OrderDashboard.tsx` — order timer badge

### Phase 2
- `packages/api/src/db/schema.ts` — all column additions
- `packages/api/src/modules/ordering/services/orders.ts` — snapshot allergens on create, paymentMethod on mark-paid
- `packages/api/src/modules/ordering/routes.ts` — new PATCH endpoints, callType param
- `packages/web/src/apps/ordering/merchant/OrderDashboard.tsx` — payment type dropdown, staff notes, sold out display
- `packages/web/src/apps/ordering/merchant/MenuManagement.tsx` (or similar) — sold out toggle, station assignment
- `packages/web/src/apps/ordering/customer/MenuBrowse.tsx` — sold out item display
- `packages/web/src/apps/ordering/customer/MenuBrowse.tsx` — Request Bill button
- `packages/web/src/apps/ordering/hooks/useTables.ts` — callType param

### Phase 3
- `packages/api/src/modules/ordering/services/orders.ts` — paid guard, override logic, auto-table-status
- `packages/api/src/modules/ordering/routes.ts` — override endpoints
- `packages/web/src/apps/ordering/merchant/OrderDashboard.tsx` — override UI, paid guard display
- `packages/web/src/apps/ordering/customer/OrderConfirmation.tsx` — editable item notes
- `packages/web/src/apps/ordering/customer/CustomerApp.tsx` — active order check, join flow

### Phase 4
- `packages/api/src/db/schema.ts` — feedback table
- `packages/api/src/modules/ordering/services/feedback.ts` (new)
- `packages/api/src/modules/ordering/routes.ts` — feedback endpoints
- `packages/web/src/apps/ordering/customer/OrderConfirmation.tsx` — feedback prompt
- `packages/web/src/apps/ordering/merchant/Analytics.tsx` — feedback tab

### Phase 5
- `packages/web/src/apps/ordering/merchant/KitchenDisplay.tsx` — station filter
- `packages/web/src/apps/ordering/merchant/OrderDashboard.tsx` — station filter

### Phase 6
- `packages/web/package.json` — add Playwright
- `packages/web/playwright.config.ts` (new)
- `packages/web/tests/e2e/` (new directory + test files)
