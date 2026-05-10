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

Finish and validate the Codex-native workflow adaptation around a deterministic proof model:

- records plus git/worktree/branch state are truth,
- `.codex/workflow/state/` is delete-safe cache,
- `.codex/workflow/runtime/` is local telemetry,
- generated guide/dashboard/Zoo surfaces are views,
- `status` is a cheap resume snapshot,
- `health`, `release-gate`, and `deployed-gate` are the heavier proof gates,
- branch hashes live on branch-scope closing records,
- delegated worker proof is explicit routing, worker patch, routing closeout, and integrated review,
- solo-dev prompts are captured as compact intent records and lead-interpreted work slices.

## Current Phase

Workflow simplification, Work Intake, guide/Zoo surfaces, and the first engine/profile extraction are implemented. Judge readiness by the workflow records plus gates, not this compact note. The current pass has:

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
- added Work Intake records and guide views so user prompt intent, lead work slices, patches, reviews, verification, audits, and deployments can be traced without reading the chat transcript.
- audited and repaired the old-Claude design-system integration docs. Active guidance now says the production Zoo/Gym route is the consolidated `packages/web/src/routes/__design/Zoo.tsx` slug map, tenant settings currently expose brand/brand-hover colors only, and the remaining themed-parity gaps are explicit in `.codex/knowledge/design-system.md`.
- removed the non-failing React `act(...)` warning in `ThemeProvider.test.tsx` with Testing Library `fireEvent.click`; focused and full local tests passed in recorded command evidence.
- completed a final code-level workflow architecture audit in `.codex/workflow/research/workflow-code-architecture-audit-2026-05-10.md`; fixes moved core paths, record prefixes/schemas/env names, classifier fixtures, guide required inputs, guide topology, document lists, and handover-template closeout wording into profile/policy-owned contracts.
- completed the user-requested end-of-work workflow-code drift re-audit; follow-up reviewers found no release-blocking drift, and the remaining low portability smell was fixed by moving public-guide redaction strings plus Zoo/Gym visual contract/title expectations into policy-owned data.
- completed a workflow kernel self-check hardening pass after parallel audit:
  - added `workflow:inventory-check`, `workflow:policy-check`, and `workflow:trace-check`,
  - wired those checks into `workflow:health` and `workflow:release-gate`,
  - made `health` print concrete failure details,
  - fixed workspace-subdirectory root discovery by using the extracted workflow engine,
  - made inventory validate both live and tracked `.codex` paths so tracked-only legacy artifacts are caught,
  - removed the unreferenced `20260509-workflow-guide-visible` screenshot set,
  - added `.codex/workflow/templates/project-bootstrap.md` for second-project setup and per-project `.codex/config.toml` guidance,
  - made generated guide copy surface `Custom (config.toml)`, `Full access` limits, `workflow:hook-runtime-check`, and the bootstrap template.

The reusable boundary is intentionally conservative: `.codex/scripts/workflow-engine.mjs` is portable loader/matcher infrastructure, while `.codex/scripts/nexus-workflow.mjs` remains the Nexus deterministic wrapper until a second project proves which larger pieces should be extracted.

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
- Work Intake guide: `.codex/knowledge/work-intake.md`
- final workflow code architecture audit: `.codex/workflow/research/workflow-code-architecture-audit-2026-05-10.md`
- design-system integration audit: `.codex/workflow/research/design-system-integration-audit-2026-05-10.md`
- final workflow portability audit: `.codex/workflow/research/workflow-portability-audit-2026-05-10.md`
- engine/profile extraction note: `.codex/workflow/research/workflow-engine-profile-extraction-2026-05-10.md`
- workflow kernel self-check audit: `.codex/workflow/research/workflow-kernel-self-check-audit-2026-05-10.md`
- second-project bootstrap template: `.codex/workflow/templates/project-bootstrap.md`
- records: `.codex/workflow/records/`
- risks: `.codex/workflow/records/risks.md`

## Open Risks

- Hooks are configured but this checkout may still show `hook runtime: not seen`; explicit workflow gates remain the enforcement source when Codex project hooks are not loaded in a session. Use trusted `Custom (config.toml)` when hook loading matters. Full access grants permissions but does not prove project config or hooks loaded.
- The first engine/profile split is in place, but it is still a conservative extraction: future projects should copy the profile/policy shape and then decide whether more of `nexus-workflow.mjs` should move into the generic engine after a second implementation proves the boundary. This is intentional, not a hidden "done" claim.
- Dependency audit baseline was rechecked on 2026-05-10 and still matches current npm audit output; recheck again by the 2026-06-09 expiry or sooner if `drizzle-kit` releases a fix. Evidence: `TEST-20260510T073945Z-dependency-audit-baseline-recheck`.
- Codex config deprecation warnings were handled at the policy/engine layer on 2026-05-10: Nexus now uses `features.hooks`, rejects deprecated hook/windows-sandbox aliases, and records the architecture reasoning in `.codex/workflow/research/workflow-architecture-recheck-2026-05-10.md`.
- Remaining design-system parity gaps are tracked in `.codex/knowledge/design-system.md`; do not treat archived Claude notes or frozen `design/reference/v1/` docs as active implementation truth without reconciliation.
