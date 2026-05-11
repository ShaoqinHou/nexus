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

- Reference bundle themed component parity is implemented for current project scope: production includes themed `OrderTracker`, `Receipt`, `PromoCard`, `EmptyState`, `Toast`, and `CheckoutSummary`. The production export names for the two ambiguous entries are `ThemedEmptyState` and `ThemedToast` because generic `EmptyState` and runtime `ToastContainer` already exist.
- Tenant settings support optional `accentColor` as a tenant-scoped override layered on top of the cuisine theme's default accent. Leaving it empty keeps the cuisine accent. Accent override variables must stay on tenant-scoped wrappers and `body` portal scope, then be removed on unmount/clear so pre-tenant chrome remains neutral. Evidence: `PATTERN-PROPOSAL-20260511T000635Z-pattern-accepted-tenant-accent-override-stays-te`.
- Theme semantic-token policy changed over time. Current implementation and reference re-theme semantic variants per cuisine; reviews should follow the current standards, not stale comments.
- Current proof covers the ThemeProvider live-preview regression, tenant wrapper scoping, brand/accent wrapper and body portal inheritance, desktop/light and mobile/dark Zoo screenshots for every registry-backed page, design-token lint, full app tests, and production Zoo-bundle exclusion. It does not yet prove every possible text/background contrast pairing across all 10 themes or every possible body-mounted portal cleanup order.

## Claude-Era Notes Reconciled

- The archived Claude workflow is historical evidence only. Active design-system guidance is this file, `.codex/knowledge/patterns.md`, `.codex/knowledge/verification.md`, `packages/web/src/components/registry.json`, and `packages/web/src/routes/__design/Zoo.tsx`.
- Archived rule wording such as `routes/__design/<name>.tsx` is stale for the current app. The live implementation uses one consolidated `Zoo.tsx` route with registry-backed slug mapping. The durable rule is: every primitive/pattern needs a registry entry, a `zooRoute`, and a real-source showcase that does not redefine the component inline.
- `design/reference/v1/nexus-design-system/project/DESIGN-SYSTEM.md` contains older semantic-token language saying semantic colors should not be re-themed. The current production theme files intentionally re-theme semantic variants per cuisine and include dark-mode contrast adjustments. Until a new design reference version supersedes `v1`, reviewers should follow the current implementation plus cited pattern evidence rather than stale reference prose.
- `design/reference/v1/nexus-design-system/project/themes/THEME-GUIDE.md` still has leftover "6 theme" wording. Its tenant accent-color override promise is now implemented as optional `accentColor` in settings, API validation, `ThemeProvider` wrapper/body styles, ThemeSettings UI, tests, and Zoo evidence.
- The old Claude docs correctly identified useful traps around dark descendant selectors, body-mounted portals, live-preview ping-pong, brand override contrast, and production Zoo exclusion. Those traps are now captured as Codex workflow knowledge and validated by scripts/records instead of living only in the archive.

## Routing And Review Heuristics

- Spark is acceptable for narrow component parity slices with explicit files and tests, such as adding one isolated component variant. Tenant accent cascade, portal mirroring, or Zoo capture behavior requires lead/strong-model handling.
- Strong-model implementation or review is required for cuisine cascade, tenant theme scope, body portals, live-preview synchronization, route/basepath behavior, cross-app imports, or visual judgment.
- Theme cascade changes require both code tests and browser evidence. At minimum check `/design` across a non-classic theme in dark mode, a body-mounted portal, and return to neutral pre-tenant chrome.

## Design Zoo / Gym

The live component gym is the dev-only route:

- `/design`
- `/design/:slug`

It is implemented in `packages/web/src/routes/__design/Zoo.tsx` and should import real components, never copies. The registry file `packages/web/src/components/registry.json` is the machine-readable source that lists every primitive/pattern and its `zooRoute`.

The Zoo is also a tenant-theme test harness. Its selected theme must be applied to a `data-theme` wrapper around the demos, and it must mirror the same theme to `document.body` so body-mounted portals can be inspected under the selected cuisine theme. Evidence: `PATTERN-PROPOSAL-20260509T110401Z-pattern-proposed-pattern-accepted-design-zoo-mus`.

Registry-backed themed parity routes include:

- `/design/order-tracker`
- `/design/receipt`
- `/design/promo-card`
- `/design/themed-empty-state`
- `/design/themed-toast`
- `/design/checkout-summary`

Production builds must not mount or eagerly ship the interactive Zoo route. `packages/web/src/routeTree.tsx` creates the `/design` routes and dynamic import only inside the `import.meta.env.DEV` branch. Public inspection uses the generated screenshot guide instead.

Evidence: `PATTERN-PROPOSAL-20260509T094319Z-pattern-accepted-production-design-zoo-uses-capt`.

After production builds, run `npm run workflow:prod-zoo-bundle-check`. It scans `packages/web/dist/assets/*.js` for `Zoo-*.js` chunks and dev-Zoo markers so this invariant is enforced by CI and the release gate, not just prose.

The Codex workflow dashboard also surfaces the zoo route list so the guide app links directly to each local gym page. The deployable visual guide is generated from live `/design` screenshots:

- `.codex/dashboard/zoo/index.html`
- `https://cv.rehou.games/nexus/workflow/zoo/`
- default captures cover desktop/light and mobile/dark contexts for every registry-backed page.
- the capture script must verify the DOM state it labels: `<html>.dark`, Zoo wrapper `data-theme`, body `data-theme`, and the theme selector value must match the requested context before a screenshot is accepted.
- captures are full-page, and the mobile Zoo layout must keep real demo content visible instead of letting navigation chrome consume the viewport.
- generated guide screenshots should preserve source evidence instead of cropping long demos such as the theme matrix.
- the visual guide source hash includes component source files from `packages/web/src/components/`, registry metadata, Zoo route code, and theme files.

Evidence: `PATTERN-PROPOSAL-20260509T110413Z-pattern-proposed-pattern-accepted-visual-zoo-cap`.

Latest local validation evidence:

- `design-parity-focused-web-20260511`
- `design-parity-api-settings-20260511`
- `design-parity-design-lint-20260511`
- `design-parity-full-tests-20260511`
- `design-parity-build-fix-20260511`
- `themeprovider-warning-fixed-20260510T1451Z`
- `local-design-lint-20260510T1452Z`
- `local-test-all-20260510T1452Z`
- `local-build-20260510T1452Z`
- `design-zoo-live-20260510T1455Z`
- `zoo-visual-capture-20260510T1456Z`
- `zoo-visual-guide-check-20260510T1458Z`
- `prod-zoo-bundle-check-20260510T1459Z`

When validating design-system work, check:

- the static workflow dashboard at `.codex/dashboard/index.html`;
- the deployable visual Zoo/Gym guide at `.codex/dashboard/zoo/index.html`;
- the running app zoo at `http://localhost:5173/design`.
- the reusable interaction check: `npm run workflow:design-zoo` with the web dev server running.
- the visual guide gate: `npm run workflow:zoo-visual-guide-check` after recapturing screenshots.
- the browser evidence gate: `npm run workflow:guide-browser-check`, backed by append-only records under `.codex/workflow/records/guide-browser/`.
