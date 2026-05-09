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

The Zoo is also a tenant-theme test harness. Its selected theme must be applied to a `data-theme` wrapper around the demos, and it must mirror the same theme to `document.body` so body-mounted portals can be inspected under the selected cuisine theme. Evidence: `PATTERN-PROPOSAL-20260509T110401Z-pattern-proposed-pattern-accepted-design-zoo-mus`.

Production builds must not mount or eagerly ship the interactive Zoo route. `packages/web/src/routeTree.tsx` creates the `/design` routes and dynamic import only inside the `import.meta.env.DEV` branch. Public inspection uses the generated screenshot guide instead.

Evidence: `PATTERN-PROPOSAL-20260509T094319Z-pattern-accepted-production-design-zoo-uses-capt`.

After production builds, run `npm run workflow:prod-zoo-bundle-check`. It scans `packages/web/dist/assets/*.js` for `Zoo-*.js` chunks and dev-Zoo markers so this invariant is enforced by CI and the release gate, not just prose.

The Codex workflow dashboard also surfaces the zoo route list so the guide app links directly to each local gym page. The deployable visual guide is generated from live `/design` screenshots:

- `.codex/dashboard/zoo/index.html`
- `https://cv.rehou.games/nexus/workflow/zoo/`
- default captures cover desktop/light and mobile/dark contexts for every registry-backed page.
- captures are full-page, and the mobile Zoo layout must keep real demo content visible instead of letting navigation chrome consume the viewport.
- generated guide screenshots should preserve source evidence instead of cropping long demos such as the theme matrix.
- the visual guide source hash includes component source files from `packages/web/src/components/`, registry metadata, Zoo route code, and theme files.

Evidence: `PATTERN-PROPOSAL-20260509T110413Z-pattern-proposed-pattern-accepted-visual-zoo-cap`.

When validating design-system work, check:

- the static workflow dashboard at `.codex/dashboard/index.html`;
- the deployable visual Zoo/Gym guide at `.codex/dashboard/zoo/index.html`;
- the running app zoo at `http://localhost:5173/design`.
- the reusable interaction check: `npm run workflow:design-zoo` with the web dev server running.
- the visual guide gate: `npm run workflow:zoo-visual-guide-check` after recapturing screenshots.
- the browser evidence gate: `npm run workflow:guide-browser-check`, backed by append-only records under `.codex/workflow/records/guide-browser/`.
