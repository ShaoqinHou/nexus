# Merchant Retheme Plan

**Scope reframed by planner agent (2026-04-25)**: the bundle's merchant kit at `design/reference/v1/nexus-design-system/project/ui_kits/merchant/Shell.jsx` is **compact and near-aligned with the existing production PlatformShell**. Same sidebar/topbar proportions, same nav grouping (Operations / Menu / Marketing / Management), same 44px hit targets, same token references. The `themed-orders.jsx` file is a Vendor-Studio onboarding preview pane, NOT a replacement layout for the production `OrderDashboard`.

This means the merchant retheme is **NOT a wholesale rebuild** like the customer-side force-swap. It's:

1. **Token-system audit** — verify all bundle-referenced tokens are defined; resolve nexus-specific extensions
2. **PlatformShell spot-check + minor polish** — the layout is already there; just align visual details to the bundle
3. **ThemeSettings major refresh** — biggest visual delta; align to the bundle's Vendor Theme Studio aesthetic + integrate a live-preview panel
4. **Per-screen visual alignment passes** — light, parallel, low-risk
5. **Standards revision** — soften `S-THEMED-COMPONENT` to allow merchant to PREVIEW cuisine themes via Vendor Studio while defaulting to classic

This is ~10-15 commits, not 50. Different shape than the customer rework.

---

## Section 1 — Standards revision

**Current `S-THEMED-COMPONENT`**:

> Customer-facing surfaces re-skin when `data-theme` flips; the merchant console stays neutral (uses 'classic' default).

**Revised**:

> Customer-facing surfaces re-skin when `data-theme` flips. The merchant console defaults to `classic` but has a Vendor Theme Studio at `/t/<slug>/ordering/settings` where the merchant can PREVIEW cuisine themes against representative customer screens before committing. The merchant's chrome layout (PlatformShell sidebar/topbar, nav, settings) follows the bundle's `Shell.jsx` spec and uses the same design-system primitives as the customer.

---

## Section 2 — Token audit (Phase 1, MUST land before parallel screen work)

| Token | Defined in `tokens.css`? | Used by | Action |
|---|---|---|---|
| `--color-primary-light` | ✓ already defined | bundle's active-nav background; production approximates with `bg-primary/10` | document; either keep production's opacity shorthand OR replace call sites with `bg-primary-light` for explicit token |
| `--color-kds-preparing` | ✓ added in `e93f187` | KitchenDisplay preparing-station | nexus-specific extension; the bundle predates the KDS use case. Document in `tokens.css` comment as a "kitchen-display extension". |
| `--color-kds-preparing-fg` | ✓ same commit | same | same |

No missing tokens. Audit's net: minor doc cleanup, no tokens to add.

---

## Section 3 — Per-screen ports (Phase 3)

| Screen | LOC | Bundle target | Delta | Approach | Parallel-safe? |
|---|---|---|---|---|---|
| ThemeSettings | 1222 | bundle's Vendor Theme Studio (live preview pane + theme picker grid + brand swatches) | LARGE — biggest visual change in the merchant | refactor section grouping, add live customer-shell preview iframe/panel | sequential (one big agent) |
| OrderDashboard | 1429 | none — bundle's themed-orders.jsx is a preview-only render, not a swap | NONE — token audit only | spot-check for stray hex, no layout change | parallel (small) |
| KitchenDisplay | 908 | none — bundle has no KDS; this is nexus-specific | TINY — already retheme-compliant via `--color-kds-preparing` token | confirm no stray hex | parallel (small) |
| MenuManagement | ~700 | bundle's menu-management screen (basic CRUD layout) | SMALL — visual alignment of card density + section gaps | density tweaks only | parallel |
| ModifierManager | ~500 | similar | SMALL | density tweaks | parallel |
| ComboManager | ~600 | similar | SMALL | density tweaks | parallel |
| PromotionManager | ~500 | similar | SMALL | density tweaks | parallel |
| QRCodes | ~300 | bundle has QR table render | SMALL | density tweaks + confirm print CSS still works | parallel |
| Analytics | ~500 | bundle has stats grid | SMALL — confirm chart palette uses `--color-primary` etc., not raw hex | parallel |
| StaffManagement | ~400 | bundle has team list | SMALL | density tweaks | parallel |
| TranslationsDashboard | ~500 | bundle doesn't show this; nexus-specific | NONE | leave as-is | n/a |
| OrderConfirmation (merchant view) | already swapped in customer side `6f173a0` | n/a | n/a | n/a |

---

## Section 4 — PlatformShell port (Phase 2)

Per planner: bundle's `Shell.jsx` and production `PlatformShell.tsx` are already structurally aligned. Need only:

- Confirm exact paddings / gaps match the bundle
- Confirm topbar's theme-toggle + language-picker placement matches
- Confirm sidebar's active-nav-item highlight uses the right token

Single agent, sequential, low risk.

---

## Section 5 — Order of operations

1. **Phase 0** — standards revision + token audit (this lead session, or 1 agent)
2. **Phase 1** — PlatformShell spot-check + polish (1 agent, sequential — touches central file)
3. **Phase 2** — ThemeSettings major refresh + Vendor Studio live preview panel (1 agent, sequential — biggest single change)
4. **Phase 3** — parallel screen ports (8 agents, one per screen with light token audit)
5. **Phase 4** — reviewer batch on Phase 1-3 commits
6. **Phase 5** — live E2E (single-actor, OR multi-character with merchant scenarios)
7. **Phase 6** — deploy + verify + watchdog stop

---

## Section 6 — Open questions (none requiring user input)

The planner found no ambiguity that needs a human decision. The bundle is clear about the merchant's role; the only judgment call is whether `bg-primary/10` (production opacity shorthand) is preferable to the bundle's `bg-primary-light` (explicit token) — and that's a stylistic preference, not a correctness issue. Recommend: keep both styles allowed; only convert when a screen is being touched anyway.

---

## Section 7 — Estimated commit / agent count

- Phase 0: 1 commit (standards + token doc)
- Phase 1: 1 commit (PlatformShell polish)
- Phase 2: 2-3 commits (ThemeSettings: extract sections + add live preview + i18n)
- Phase 3: 8 commits (one per parallel screen, low-LOC each)
- Phase 4: 0 commits (reviewer is read-only)
- Phase 5: 0 commits (E2E is read-only)
- Phase 6: deploy

**Total**: ~12-13 commits. Significantly smaller than the customer rework (58 commits).

The disparity is by design — the bundle says merchant chrome shouldn't visually transform per cuisine; only the customer surfaces do. So the merchant retheme is more "polish + Vendor Studio" than "force-swap + extend".
