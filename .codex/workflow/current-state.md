# Current State

Updated: 2026-05-10

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

## Active Goal

Harden the Codex-native workflow around a simpler proof model:

- records plus git/worktree/branch state are truth,
- `.codex/workflow/state/` is delete-safe cache,
- `.codex/workflow/runtime/` is local telemetry,
- generated guide/dashboard/Zoo surfaces are views,
- `status` is a cheap resume snapshot,
- `health`, `release-gate`, and `deployed-gate` are the heavier proof gates,
- branch hashes live on branch-scope closing records,
- delegated worker proof is explicit routing, worker patch, routing closeout, and integrated review.

## Current Phase

Workflow simplification and boundary hardening are implemented and should be judged by the workflow records plus gates, not this compact note. The current pass has:

- moved mutable state JSON out of `.codex/workflow/records/`,
- made status cheap and added `workflow:health`,
- added timed command telemetry under runtime,
- embedded compact command-run summaries into passing verify/audit/deployment records so gates validate durable command evidence instead of mutable telemetry,
- added branch-scope evidence and branch-introduced delegated-worker checks,
- added enforced delegated-worker routing closeout,
- collapsed the operator-facing route to one ladder: `status -> health -> release-gate -> deployed-gate`,
- made generated guide/Zoo artifacts trigger the relevant gates even though they remain non-substantive generated views,
- made guide-browser records embed screenshot and summary hashes so mutable artifact files cannot silently rewrite a pass,
- canonicalized text content hashing for worktree/branch evidence so Windows and Linux release gates compute the same branch hash,
- separated local release readiness from deployment evidence,
- made the visual Zoo/Gym capture fail closed when requested theme or mode is not reflected in the DOM,
- regenerated the dashboard/public guide/Zoo guide from the current workflow and design-system records,
- completed an additional high-level workflow audit with parallel reviewers and captured the portability/generalization assessment in `.codex/workflow/research/workflow-portability-audit-2026-05-10.md`,
- fixed the final audit findings by adding `.codex/knowledge/verification.md` to deterministic guide-hash and required-file inputs, including workflow research reports in guide freshness, keeping `workflow:status` cheap while moving record-history validation to `workflow:health` and release gates, and adding a checked-in deployed Zoo/Gym image-load validation command.
- completed the first reusable extraction needed for a second project by adding `.codex/scripts/workflow-engine.mjs`, `.codex/workflow/profile.json`, and `.codex/workflow/policy/*.json`; Nexus-specific facts now live in policy data for records, file classifiers, review-kind classifiers, guide contracts, design inputs, hook expectations, and deployment URLs.
- fixed a deployment-guide self-reference loop by excluding deployment records from public-guide source-hash inputs while keeping them displayable in regenerated guide views.
- completed a workflow kernel self-check hardening pass after parallel audit:
  - added `workflow:inventory-check`, `workflow:policy-check`, and `workflow:trace-check`,
  - wired those checks into `workflow:health` and `workflow:release-gate`,
  - made `health` print concrete failure details,
  - fixed workspace-subdirectory root discovery by using the extracted workflow engine,
  - made inventory validate both live and tracked `.codex` paths so tracked-only legacy artifacts are caught,
  - removed the unreferenced `20260509-workflow-guide-visible` screenshot set,
  - added `.codex/workflow/templates/project-bootstrap.md` for second-project setup and per-project `.codex/config.toml` guidance,
  - made generated guide copy surface `Custom (config.toml)`, `Full access` limits, `workflow:hook-runtime-check`, and the bootstrap template.

## How To Resume

1. Read `.codex/README.md`.
2. Run `npm run workflow:status`.
3. Inspect detailed evidence under `.codex/workflow/records/` only when needed.
4. Use `npm run workflow:health` for diagnostics and `npm run workflow:release-gate` before local release handover.
5. Use `npm run workflow:deployed-gate` after server validation when deployment is in scope.

Branch closeout uses branch-scope patch, review, verification, and audit records tied to the current branch hash. Worktree-scope records are useful during coding, but the release gate expects branch-scope closeout records when the branch has a substantive diff.

## Important Git Note

Plain `git` may misread this linked worktree if it resolves the submodule common git dir. The reliable command form is:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```

## Detailed Evidence

Use the generated guide and append-only records instead of this compact handover for history:

- public workflow guide: `https://cv.rehou.games/nexus/workflow/`
- visual Zoo/Gym guide: `https://cv.rehou.games/nexus/workflow/zoo/`
- local generated dashboard: `.codex/dashboard/index.html`
- final workflow portability audit: `.codex/workflow/research/workflow-portability-audit-2026-05-10.md`
- engine/profile extraction note: `.codex/workflow/research/workflow-engine-profile-extraction-2026-05-10.md`
- workflow kernel self-check audit: `.codex/workflow/research/workflow-kernel-self-check-audit-2026-05-10.md`
- second-project bootstrap template: `.codex/workflow/templates/project-bootstrap.md`
- records: `.codex/workflow/records/`
- risks: `.codex/workflow/records/risks.md`

## Open Risks

- Hooks are configured but this checkout may still show `hook runtime: not seen`; explicit workflow gates remain the enforcement source when Codex project hooks are not loaded in a session. Use trusted `Custom (config.toml)` when hook loading matters. Full access grants permissions but does not prove project config or hooks loaded.
- The first engine/profile split is in place, but it is still a conservative extraction: future projects should copy the profile/policy shape and then decide whether more of `nexus-workflow.mjs` should move into the generic engine after a second implementation proves the boundary.
- Dependency audit baseline was rechecked on 2026-05-10 and still matches current npm audit output; recheck again by the 2026-06-09 expiry or sooner if `drizzle-kit` releases a fix. Evidence: `TEST-20260510T073945Z-dependency-audit-baseline-recheck`.
- Clean the non-failing React `act(...)` warning in `ThemeProvider.test.tsx`.
