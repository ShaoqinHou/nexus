# Current State

Updated: 2026-05-11

## Original Request

The user asked for a real Codex-native adaptation of the old Claude Code workflow, not a rename. The preserved brief is:

- `.codex/workflow/briefs/2026-05-09-original-user-brief.md`

## First Required Answer

Design system directory inside this project: yes.

Evidence checked:

- `C:\Users\housh\.codex\worktrees\7514\nexus\design`
- `C:\Users\housh\.codex\worktrees\7514\nexus\design\reference\v1\nexus-design-system`
- `C:\Users\housh\.codex\worktrees\7514\nexus\packages\web\src\platform\theme`
- `C:\Users\housh\.codex\worktrees\7514\nexus\packages\web\src\components\patterns\themed`
- `C:\Users\housh\.codex\worktrees\7514\nexus\packages\web\src\routes\__design`

## Current Work

No active work slice is open in this compact handover.

Latest completed workflow architecture slice:

- `WORK-SLICE-20260511T061540Z-work-slice-done-audit-workflow-command-telemetry`

Use detailed records and research notes for history. This file is only the compact handover.

## Workflow State

The Codex-native workflow is active on branch `codex/native-workflow`.

Canonical route:

1. `npm run workflow:status`
2. `npm run workflow:health` when diagnosing
3. `npm run workflow:release-gate` before local handover or commit
4. `npm run workflow:deployed-gate` after hosted/server validation when deployment is in scope

The hosted guide surfaces are:

- `https://cv.rehou.games/nexus/workflow/`
- `https://cv.rehou.games/nexus/workflow/zoo/`

## Durable Evidence

Use these entry points instead of chat transcript history:

- `.codex/README.md`
- `.codex/workflow/principles.md`
- `.codex/workflow/capabilities.md`
- `.codex/knowledge/work-intake.md`
- `.codex/knowledge/design-system.md`
- `.codex/workflow/records/`
- `.codex/workflow/research/`
- `.codex/dashboard/index.html`

Recent completed closeout before the current slice:

- patch: `PATCH-20260511T040342Z-codex-native-workflow-design-system-parity-deter`
- verification: `TEST-20260511T040449Z-verification-pass-branch`
- audit: `AUDIT-20260511T040503Z-audit-pass-branch`
- deployment: `DEPLOYMENT-20260511T040826Z-deploy-workflow-portability-onboarding-guide-upd`

Current data-shape audit closeout:

- patch: `PATCH-20260511T053900Z-finalize-workflow-data-shape-taxonomy-compatibil`
- verification: `TEST-20260511T054049Z-verification-pass-worktree`
- audit: `AUDIT-20260511T054102Z-audit-pass-worktree`

Current performance audit closeout:

- patch: `PATCH-20260511T061346Z-instrument-and-speed-up-guide-browser-evidence-f`
- verification: `TEST-20260511T061518Z-verification-pass-worktree`
- audit: `AUDIT-20260511T061531Z-audit-pass-worktree`

## Open Risks

- Hook loading is session/config dependent. Use trusted `Custom (config.toml)` when hooks matter; explicit workflow gates remain the enforcement source.
- The engine/profile extraction is conservative. A second project should rewrite profile/policy and adapt the wrapper before extracting more generic code.
- Dependency audit baseline expires on 2026-06-09. Recheck before then or when `drizzle-kit` changes.
- Design-system contrast coverage is stronger for primary-colored surfaces than for every possible token pair across all themes.

## Resume

1. Read `.codex/README.md`.
2. Run `npm run workflow:status`.
3. If continuing workflow architecture work, read `.codex/workflow/principles.md` and `.codex/workflow/capabilities.md`.
4. Inspect the active work-slice record above, then open only linked records or research files needed for the task.
5. Before final local handover, run `npm run workflow:release-gate`.

## Git Note

This checkout is a linked worktree. If plain `git` misreads the state, use:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```
