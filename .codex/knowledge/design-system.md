# Design-System Knowledge

## Source Of Truth

The frozen design reference is:

- `design/reference/v1/nexus-design-system/`

Primary reference files:

- `design/reference/v1/nexus-design-system/project/DESIGN-SYSTEM.md`
- `design/reference/v1/nexus-design-system/project/themes/THEME-GUIDE.md`
- reference CSS and JSX under `design/reference/v1/nexus-design-system/project/`

Production implementation is under:

- `packages/web/src/platform/theme/`
- `packages/web/src/components/ui/`
- `packages/web/src/components/patterns/`
- `packages/web/src/components/patterns/themed/`
- `packages/web/src/routes/__design/Zoo.tsx`

## Runtime Contract

- `tokens.css` defines base CSS custom properties.
- `themes.css` aggregates the 10 cuisine theme files.
- `.dark` lives on `<html>`.
- Cuisine theme identity lives on tenant-scoped wrappers via `data-theme`.
- Pre-tenant routes stay neutral and should not set `data-theme` on `<html>`.
- Tenant brand overrides layer as CSS variables on the tenant wrapper and on `body` for portals.
- Dark cuisine selectors must support `.dark [data-theme="<id>"]`; compound `[data-theme="<id>"].dark` may exist only as compatibility fallback.
- Cuisine themes must not rely on `.light` inversion; the platform does not set a `.light` class.
- `initialThemeId` is a prop-sync signal for saved tenant settings, not a reason to overwrite local live-preview state on every render.
- Body-mounted portals must inherit tenant theme variables and must clean them up when tenant-scoped providers unmount.

Evidence: `PATTERN-PROPOSAL-20260508T170332Z-pattern-accepted-theme-cascade-changes-require-s`.

## Canonical Theme IDs

- `classic`
- `trattoria`
- `izakaya`
- `bubble-tea`
- `counter`
- `taqueria`
- `curry-house`
- `sichuan`
- `cantonese`
- `wok`

## Current Known Gaps To Verify

- Reference bundle includes themed `EmptyState` and `Toast`; production currently has themed `OrderTracker`, `Receipt`, `PromoCard`, and `CheckoutSummary`.
- Theme semantic-token policy changed over time. Current implementation and reference re-theme semantic variants per cuisine; reviews should follow the current standards, not stale comments.
- Existing tests do not fully prove visual contrast, all-theme differentiation, dark mode, portal inheritance, or portal cleanup ordering.

## Routing And Review Heuristics

- Spark is acceptable for narrow component parity slices with explicit files and tests, such as adding one missing Toast variant.
- Strong-model implementation or review is required for cuisine cascade, tenant theme scope, body portals, live-preview synchronization, route/basepath behavior, cross-app imports, or visual judgment.
- Theme cascade changes require both code tests and browser evidence. At minimum check `/design` across a non-classic theme in dark mode, a body-mounted portal, and return to neutral pre-tenant chrome.

## Design Zoo / Gym

The live component gym is the dev-only route:

- `/design`
- `/design/:slug`

It is implemented in `packages/web/src/routes/__design/Zoo.tsx` and should import real components, never copies. The registry file `packages/web/src/components/registry.json` is the machine-readable source that lists every primitive/pattern and its `zooRoute`.

The Codex workflow dashboard also surfaces the zoo route list so the guide app links directly to each local gym page. When validating design-system work, check both:

- the static workflow dashboard at `.codex/dashboard/index.html`;
- the running app zoo at `http://localhost:5173/design`.
- the reusable interaction check: `npm run workflow:design-zoo` with the web dev server running.
