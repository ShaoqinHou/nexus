# E2E Role-Play User Stories — feat/design-workflow-v2

Five characters use the live system in parallel. Each agent role-plays one
character against the same dev server (port 5173 web, 3001 api). The shared
SQLite backend provides cross-character coordination — when Aiko places an
order, Liam sees it in the kitchen display because they share a tenant.

## Coordination

Sentinel files live in `.claude/workflow/scratch/e2e-rolepay/` (gitignored).
Each agent writes progress markers and watches for upstream markers it depends
on.

```
maya-ready.flag                # set by Maya after shop is configured
aiko-order-{id}.flag          # set by Aiko after each order is placed
marco-order-{id}.flag         # same for Marco
liam-marked-{id}.flag         # set by Liam when an order is marked ready
```

Agents poll via `until [ -f <file> ]; do sleep 2; done` patterns. No agent
spins for more than 90 s without giving up + reporting "blocked".

## Reports

Each character writes a report to
`.claude/workflow/scratch/e2e-rolepay/{character}.md`
with a per-step PASS/FAIL + observation + screenshot keyframe description.

## Browser sharing

chrome-devtools MCP runs ONE Chrome instance. Each agent claims its own page
via `new_page`, saves the returned pageId, and uses `select_page` before every
subsequent browser action so it doesn't accidentally drive another character's
tab.

Headless if the MCP allows; otherwise headful is fine. Visual verification is
the screenshots, not real-time human view.

---

## Character 1 — Maya, Owner of Demo Restaurant

**Login**: `demo@example.com / password123`
**Tenant**: Demo Restaurant (`demo`)

**Story**: Maya owns the place. Today she's giving the dining room a fresh
look for the dinner crowd — picking the Sichuan cuisine theme and creating a
"Welcome" promo for new customers.

**Goals**:
1. Log in. Land on the tenant picker if it appears, choose Demo Restaurant.
2. Open ThemeSettings. Confirm the cuisine-theme dropdown exists. Pick "Sichuan"
   from the dropdown — verify the live preview reskinned the page (warm reds,
   cream surface). Save.
3. Open PromotionManager (if it exists in nav). Create a 15% promo named
   "Welcome 15" with code `WELCOME15`, active now, no end date.
4. Confirm the menu has at least 3 items including one vegetarian + one with
   nuts (for Aiko's allergen filter test). If missing, add them.
5. Take screenshots at each major step. Confirm the merchant nav now shows
   the new theme (or stays neutral per `S-THEMED-COMPONENT` — merchant console
   is not theme-cascaded, only the customer is).

**Sentinel out**: write `scratch/e2e-rolepay/maya-ready.flag` when steps 1-4
are complete.

**Auto-explore**: after the scripted steps, click into 2-3 random merchant
pages (Analytics, Staff, QR codes). Note any visual anomalies under the new
theme (or confirm none, since merchant should stay classic).

---

## Character 2 — Aiko, Vegetarian customer at Demo Table 3

**Tenant**: Demo Restaurant (`demo`)
**Table**: 3
**No login** — QR-scan flow.

**Story**: Aiko stops in for an early dinner. Vegetarian, allergic to nuts.
She browses the menu, applies the dietary filter, and places a small order.

**Goals**:
1. **Wait** for `maya-ready.flag` (poll, max 90s).
2. Navigate to `http://localhost:5173/order/demo?table=3`. Take a snapshot.
3. **Verify** the page has `data-theme="sichuan"` on `<html>` (Maya set it).
4. **Verify** the "Special Offers" PromoCard strip shows the WELCOME15 promo.
5. **Verify** dietary icons render via `<use href="/dietary-icons.svg#di-...">`.
6. Apply allergen filter: avoid `nuts`. Verify nut-containing items get
   visually de-emphasized or filtered.
7. Add a vegetarian item to cart. Open cart sheet (CheckoutSummary should
   show via the themed component).
8. Apply promo code `WELCOME15`. Verify discount line appears.
9. Place order. Land on confirmation page. Take a snapshot.
10. **Verify** OrderTracker shows "Received" highlighted at step 1.
11. **Verify** Receipt block renders with cancel-buttons + EditableItemNotes
    on each line item (proves the itemRenderer slot wiring).

**Sentinel out**: write `scratch/e2e-rolepay/aiko-order-{orderId}.flag`
containing the order ID.

**Cross-character**: poll for `liam-marked-{orderId}.flag` (max 60s) — when
Liam marks the order ready, the confirmation page's OrderTracker should
advance from "Received" → "Preparing" → "Ready". Snapshot at "Ready" state.

**Auto-explore**: try the language picker (switch to Chinese, confirm UI
flips). Try resizing the viewport to 375px and verify the OrderTracker uses
the vertical mobile layout.

---

## Character 3 — Marco, Customer at Demo Table 7

**Tenant**: Demo Restaurant (`demo`)
**Table**: 7
**No login**.

**Story**: Marco joins his friends. Bigger appetite. Uses the WELCOME15 promo.
After placing an order, requests cancellation of one item (proves the
interactive Receipt pattern).

**Goals**:
1. Wait for `maya-ready.flag`.
2. Navigate to `/order/demo?table=7`. Snapshot.
3. Browse 2-3 menu categories. Add 4-5 items to cart (mix of mains/sides).
4. Verify a few items show contains-allergen warnings via `<DietaryIcon
   name="contains-..." />`.
5. Apply WELCOME15 promo. Confirm discount applies.
6. Place order.
7. **Verify** the Receipt's interactive UI on the confirmation page:
   - Click "Request cancellation for {item name}" on one line. Confirm the
     item flips to "Cancellation Requested" status.
   - Click "Add note" on another item. Type a note. Save.
8. **Verify** the OrderTracker stays at "Received" until Liam moves it.

**Sentinel out**: `scratch/e2e-rolepay/marco-order-{orderId}.flag`.

**Auto-explore**: try the request-bill button. Try the call-waiter button.
Check the shopping cart icon shows the right count.

---

## Character 4 — Liam, Kitchen lead at Demo Restaurant

**Login**: `demo@example.com / password123`
**Tenant**: Demo Restaurant (`demo`)
**Role**: Kitchen-display operator.

**Story**: Liam runs the kitchen. He watches the KDS for incoming orders,
marks items as ready as the kitchen completes them.

**Goals**:
1. Log in. Navigate to `/t/demo/ordering/kitchen` (Kitchen Display).
2. **Verify** the KDS renders. Snapshot.
3. **Verify** the "Preparing" station header tints with the new
   `--color-kds-preparing` token (`#ede9fe` light / `#2e1065` dark, or whatever
   the cascade resolves under sichuan theme).
4. **Wait** for both `aiko-order-*.flag` and `marco-order-*.flag` to appear.
5. **Verify** both orders show in the KDS "New" or "Confirmed" column.
6. Move Aiko's order to "Preparing". Check items off as ready. Move to
   "Ready". Snapshot.
7. **Sentinel out**: write `liam-marked-{aikoOrderId}.flag` when Aiko's order
   is marked ready.
8. Repeat for Marco's order.
9. **Verify** the SSE real-time updates work — Aiko's confirmation page
   should reflect the new status without the customer reloading.

**Auto-explore**: try the station filter (All / Kitchen / Bar / Pass). Try
print-ticket on one order. Check the orders dashboard at
`/t/demo/ordering/orders`.

---

## Character 5 — Tom, Cross-tenant attacker at Sakura Sushi Table 1

**Tenant**: Sakura Sushi (`sakura`)
**Table**: 1
**No login**.

**Story**: Tom is at a different restaurant. He shouldn't see anything
related to Demo Restaurant. This character VERIFIES tenant isolation under
load (when Maya/Aiko/Marco are concurrently making changes to Demo).

**Goals**:
1. Navigate to `/order/sakura?table=1`. Snapshot.
2. **Verify** the menu shows Sakura Sushi items (sushi, ramen, etc.) and
   NOT Demo Restaurant items.
3. **Verify** the data-theme attribute is whatever Sakura's tenant settings
   say (likely `classic` — they didn't change theirs).
4. **Verify** the PromoCard strip does NOT show WELCOME15 (Maya's promo
   was for Demo, tenant-isolated).
5. Try `/api/order/sakura/promotions` directly via curl — assert no Demo
   promos in the response.
6. Try `/api/order/sakura/menu` — assert items are Sakura-only.
7. Add a sushi item to cart. Place a small order.
8. **Verify** the order doesn't appear on Demo's KDS (Liam can spot-check
   when he reads this report).

**Auto-explore**: try the URL-param attack: `/order/sakura?table=1&tenantSlug=demo`
or similar — should not allow cross-tenant data access. Try fetching Demo
order IDs directly via `/api/order/demo/order/{id}` — should fail or return 404
when Tom's session has no Demo cookies.

---

## Oversight (lead session)

Reviews each character report. Looks for:
- Cross-character contradictions (Aiko sees order placed but Liam doesn't).
- Missing screenshots.
- Visual regressions agents noted that the lead should escalate.
- Tenant-isolation breaches (Tom seeing Demo data).
- Theme-cascade failures (sichuan colours leaking to Sakura, or not reaching
  Aiko/Marco).
- Console errors any agent reported.

Writes the consolidated report to
`.claude/workflow/scratch/e2e-rolepay-final.md`.
