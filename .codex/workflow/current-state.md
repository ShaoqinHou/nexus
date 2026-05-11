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

Latest completed workflow architecture slices:

- `WORK-SLICE-20260511T092322Z-work-slice-done-implement-behavior-preserving-wo`
- `WORK-SLICE-20260511T124359Z-work-slice-done-research-design-implement-and-te`
- `WORK-SLICE-20260511T124842Z-work-slice-verified-research-design-implement-an`

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

Current adapter-backed workflow refactor closeout:

- decision: `DECISION-20260511T090116Z-clarify-adapter-source-owners-for-exact-files-an`
- patch: `PATCH-20260511T091852Z-adapter-backed-workflow-refactor-with-fixed-path`
- reviews: `REVIEW-20260511T091908Z-review-general-pass-worktree`, `REVIEW-20260511T091918Z-review-workflow-pass-worktree`, `REVIEW-20260511T091934Z-review-pattern-pass-worktree`, `REVIEW-20260511T091946Z-review-design-pass-worktree`, `REVIEW-20260511T091958Z-review-integrated-pass-worktree`
- verification: `TEST-20260511T092132Z-verification-pass-worktree`
- audit: `AUDIT-20260511T092206Z-audit-pass-worktree`

The refactor centralizes fixed-path workflow files through `.codex/workflow/policy/adapters.json`. Exact-file adapter sources live in `.codex/workflow/project/adapters/`; package workflow scripts are owned by `.codex/workflow/policy/gates.json` `gates.packageScripts`. A routing-cache bug found during closeout was fixed in `.codex/scripts/nexus-workflow.mjs` and regression-tested in `workflow:self-test`.

Current system/project extraction closeout:

- intent: `INTENT-20260511T101550Z-intent-maintenance-fully-extract-workflow-system`
- work slice: `WORK-SLICE-20260511T124359Z-work-slice-done-research-design-implement-and-te`
- local verification closeout: `WORK-SLICE-20260511T124842Z-work-slice-verified-research-design-implement-an`
- decision: `DECISION-20260511T112806Z-extract-reusable-workflow-system-from-nexus-proj`
- research: `.codex/workflow/research/workflow-system-project-separation-2026-05-11.md`

The workflow now has a reusable system layer at `.codex/workflow/system/`, a project-specific layer at `.codex/workflow/project/`, and an inspectable empty-project fixture at `.codex/workflow/system/fixtures/portable-empty/`. The deterministic portability check role-plays a fresh project with disabled/stubbed optional capabilities and checks that the reusable system does not carry Nexus app literals into the target project.

Final local proof for this extraction is recorded with `wf-extract-*-final3` command ids. Use the latest branch-scope patch/review/verification/audit records tied to the current branch hash as the closeout source of truth; deployment proof remains in deployment records plus `workflow:deployed-gate`.

## Open Risks

- Hook loading is still session/config dependent even though this session has now seen the project hook runtime. Use trusted `Custom (config.toml)` when hooks matter; explicit workflow gates remain the enforcement source.
- A second project should copy the reusable system layer, then rewrite profile, policy, knowledge, adapter sources, agents, skills, package scripts, and optional capability inputs before installing fixed-path outputs.
- Dependency audit baseline expires on 2026-06-09. Recheck before then or when `drizzle-kit` changes.
- Design-system contrast coverage is stronger for primary-colored surfaces than for every possible token pair across all themes.

## Resume

1. Read `.codex/README.md`.
2. Run `npm run workflow:status`.
3. If continuing workflow architecture work, read `.codex/workflow/principles.md`, `.codex/workflow/capabilities.md`, `.codex/workflow/system/README.md`, and `.codex/workflow/project/README.md`.
4. Open only linked records or research files needed for the task.
5. Before final local handover, run `npm run workflow:release-gate`.

## Git Note

This checkout is a linked worktree. If plain `git` misreads the state, use:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```
