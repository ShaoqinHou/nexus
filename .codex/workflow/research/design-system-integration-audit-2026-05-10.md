# Design-System Integration Audit

Date: 2026-05-10

## Purpose

Audit the partially migrated design-system work that started under the old Claude Code workflow, identify stale or wrong guidance, map the current implementation state, and move the reliable knowledge into the Codex workflow record/guide system.

Work slice: `WORK-SLICE-20260510T151021Z-work-slice-active-audit-and-repair-old-claude-de`

## Sources Checked

- Archived Claude workflow: `.codex/archive/claude-code-2026-05-09/CLAUDE.md`
- Active design guidance: `.codex/knowledge/design-system.md`
- Active pattern guidance: `.codex/knowledge/patterns.md`
- Verification guidance: `.codex/knowledge/verification.md`
- Frozen reference: `design/reference/v1/nexus-design-system/project/DESIGN-SYSTEM.md`
- Production theme source: `packages/web/src/platform/theme/`
- Production component index: `packages/web/src/components/registry.json`
- Live component gym: `packages/web/src/routes/__design/Zoo.tsx`

## Reconciled Stale Guidance

- The archived Claude trap `missing-zoo-page` says to add `routes/__design/<name>.tsx`. Current Nexus uses one consolidated `packages/web/src/routes/__design/Zoo.tsx` with registry-backed slug mapping. The durable rule is registry entry plus `zooRoute` plus real-source showcase.
- The reference `DESIGN-SYSTEM.md` says semantic tokens are stable across tenants and should not be re-themed. Current production theme files intentionally re-theme semantic variants per cuisine and include dark-mode contrast fixes. Active reviews should follow current implementation plus Codex pattern evidence until a new reference version supersedes `v1`.
- The reference `THEME-GUIDE.md` says tenant overrides include accent color and still contains leftover "6 theme" file-list wording. Current production tenant settings and `ThemeProvider` support brand color/hover only; accent is theme-defined until a dedicated implementation slice adds it end to end.
- Old Claude notes correctly identified dark descendant selector, body portal inheritance, ThemeSettings ping-pong, brand override contrast, and production Zoo exclusion traps. Those are now active Codex guidance under `.codex/knowledge/` and deterministic checks, not only archive text.

## Current Implementation State

- `ThemeProvider` keeps `.dark` on `<html>`, tenant cuisine identity on wrapper `data-theme`, and mirrors tenant theme variables to `document.body` for body-mounted portals.
- `ThemeProvider.test.tsx` covers neutral outer mode, tenant customer/merchant scoping, brand override placement, nested providers, and live-preview ping-pong behavior.
- `components/registry.json` lists 24 UI/pattern entries and each declares a `zooRoute`.
- The Zoo/Gym route imports real components and functions as a theme-cascade test harness.
- The deployable visual Zoo/Gym guide contains 54 captures: 27 registry-backed pages in desktop/light Sichuan and 27 in mobile/dark Sichuan.

## Evidence

- `themeprovider-warning-repro-20260510T1449Z`: reproduced the React `act(...)` warning before the test fix.
- `themeprovider-warning-fixed-20260510T1451Z`: focused ThemeProvider test passed without the warning.
- `local-design-lint-20260510T1452Z`: design-token lint passed, 90 files scanned.
- `local-test-all-20260510T1452Z`: full API and web tests passed.
- `local-build-20260510T1452Z`: production web build passed.
- `design-zoo-live-20260510T1455Z`: live `/design/toast` validated dark mode, Sichuan theme selection, body theme mirroring, warning toast, and 15.45 heading contrast.
- `zoo-visual-capture-20260510T1456Z`: captured all visual Zoo/Gym targets.
- `zoo-visual-guide-check-20260510T1458Z`: visual guide freshness/content check passed.
- `prod-zoo-bundle-check-20260510T1459Z`: production build does not ship the dev-only interactive Zoo chunk/markers.

## Remaining Real Gaps

- Reference-only themed `EmptyState` and themed `Toast` parity is not yet implemented in production's `components/patterns/themed/`.
- Per-tenant accent override is documented in the frozen reference but not implemented in production. Treat that as unsupported unless a new feature slice adds it through tenant settings, `ThemeProvider`, body mirroring, tests, and Zoo/Gym evidence.
- Current automated contrast proof checks a representative dark Sichuan path and captured screenshots, not every text/background pairing across all 10 themes.
- Portal inheritance is proven for the live Toast path; exhaustive cleanup ordering across every body-mounted portal component remains a future hardening target.

## Durable Updates Made

- Updated `.codex/knowledge/design-system.md` with the reconciled Claude-era notes, current validation evidence, and more precise remaining gaps.
- Updated `.codex/knowledge/patterns.md` and `packages/web/src/components/registry.json` so active guidance points to the consolidated Zoo slug map instead of a per-file route mental model.
- Updated `.codex/workflow/records/risks.md` to close the ThemeProvider warning risk and keep only the remaining design-system drift/parity risk open.
