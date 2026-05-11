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
- completed a duplicate-agent workflow architecture audit focused on gaps in the deterministic workflow itself, not just self-audit output:
  - tightened command evidence to exact npm-script classes instead of substring matching,
  - made branch-scope verification and audit derive files from the real branch diff,
  - bound guide deployment proof to the configured public workflow guide URL,
  - removed localhost/private-string leaks from public guide/Zoo surfaces and checks,
  - made Work Intake inbox hide already-sliced intents,
  - made guide-browser finalization depend on existing closeout evidence instead of acting as an alternate closeout path,
  - made trace checks surface warned/timed-out command ids while keeping historical probes non-blocking,
  - expanded deterministic self-tests to cover spoofing, path traversal, branch evidence narrowing, retired commands, timeout telemetry, and deployment target failures.
- completed the follow-up duplicate-agent audit fixes after independent reviewers found remaining workflow architecture gaps:
  - new evidence records must now be cleanly staged before release; staged-then-modified evidence no longer satisfies commit-bound proof,
  - branch-scope patch and review records reject narrowed file lists and branch evidence derives exact file coverage from the real branch diff,
  - deployment evidence requires both production app/API proof and public workflow-guide/Zoo proof,
  - remaining Design Zoo/Gym registry and route source paths used by generated guide surfaces now come from design policy data instead of script literals,
  - live Zoo validation now checks warning toast, dark Sichuan body/theme mirroring, dialog portal contrast, and tour portal contrast,
  - the deployable Zoo/Gym guide is a screenshot-based visual surface generated from the live `/design` routes, while production `/nexus/design` remains excluded from the app bundle.
- completed the user-requested additional executable workflow audit pass after the duplicate-agent wave:
  - record integrity now expands untracked evidence directories with `git ls-files --others --exclude-standard`, so second-project/bootstrap cases cannot hide untracked proof behind a collapsed `?? records/<kind>/` status line,
  - deployment app proof now reads `publicAppUrl`, `apiHealthUrl`, and `publicAssetPrefix` from deployment policy and fails closed when policy is missing,
  - Design Zoo validation and visual capture helpers now require profile env names and design policy fields through reusable workflow-engine helpers instead of falling back to Nexus literals,
  - public-guide sanitizer logic is shared from the workflow engine and consumes guide policy data,
  - dashboard knowledge sections, session-start guidance, resume docs, hook-permission guidance, and branch-closeout command examples are policy-owned guide contracts,
  - fresh evidence includes `final14b-self-test-20260511` with 233 checks passing, `final14-design-zoo-20260511`, `final14-zoo-visual-capture-20260511`, and `final14b-zoo-visual-guide-check-20260511`.
- fixed the deployment-guide self-reference loop discovered during deployed-gate validation: deployment records remain first-class gate evidence, while the Work Intake guide trace omits self-referential deployment proof through policy-owned `selfReferentialEvidenceKinds` and `traceEvidenceKinds`; self-test and guide-check integration fixtures cover the regression.
- final reviewer follow-up tightened that fix again:
  - `guideTraceEvidenceKinds()` now fails closed by excluding self-referential evidence even when `traceEvidenceKinds` is empty,
  - display-only record labeling is generic instead of deployment-specific,
  - generated Work Intake feature counts say `trace evidence` so intentionally omitted deployment proof is not mistaken for canonical evidence totals,
  - fresh local command evidence includes `final22-self-test-20260511` with 238 checks passing, `final22-guide-check-20260511`, `final22-zoo-visual-guide-check-20260511`, `final21-unit-tests-20260511`, and `final21-build-20260511`.
- completed a final bounded duplicate-agent audit after design-system parity work:
  - workflow audit found the branch was intentionally not release-ready until branch/deployment proof is recorded and found the primary contrast lint needed fail-closed behavior,
  - design audit found one remaining nested `bg-primary`/`text-text-inverse` usage in `OrderDashboard`,
  - fixes added the `--color-primary-text` / `text-primary-text` contract across primary-colored surfaces, hardened design lint for direct/nested source patterns and unresolved theme token contrast, and adjusted workflow self-test coverage so guide self-reference checks do not depend on unrelated live record staleness,
  - fresh worktree evidence includes `final-primary-text-design-lint-confirm-20260511`, `final-primary-text-self-test-confirm-20260511`, `final-primary-text-policy-check-confirm-20260511`, `final-primary-text-full-tests-confirm-20260511`, `final-primary-text-build-confirm-20260511`, `final-primary-text-production-base-build-confirm-20260511`, `final-primary-text-theme-settings-browser-confirm-20260511`, `final-primary-text-design-zoo-confirm-20260511`, and `final-primary-text-zoo-capture-confirm-20260511`.
- fixed the final deployment-guide stale artifact loop found by `workflow:deployed-gate`: deployment records are now gate-only in generated guide artifacts, deployment-dependent Work Intake warnings are filtered from guide views, and `workflow:self-test` covers the regression so future deployment proof cannot mutate the guide artifact it validates.
- fixed the follow-up generated-guide determinism gap: dashboard, public guide, and Zoo/Gym guide surfaces now show source/content hashes instead of wall-clock generation timestamps, so harmless guide regeneration does not stale deployment proof.

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
- duplicate-agent workflow architecture audit: `.codex/workflow/research/workflow-duplicate-agent-audit-2026-05-11.md`
- second-project bootstrap template: `.codex/workflow/templates/project-bootstrap.md`
- records: `.codex/workflow/records/`
- risks: `.codex/workflow/records/risks.md`

## Open Risks

- Hooks are configured and this checkout has now emitted hook runtime telemetry. Hook loading is still session/config dependent, so explicit workflow gates remain the enforcement source. Use trusted `Custom (config.toml)` when hook loading matters; Full access grants permissions but does not prove project config or hooks loaded.
- The first engine/profile split is in place, but it is still a conservative extraction: future projects should copy the profile/policy shape and then decide whether more of `nexus-workflow.mjs` should move into the generic engine after a second implementation proves the boundary. This is intentional, not a hidden "done" claim.
- Dependency audit baseline was rechecked on 2026-05-10 and still matches current npm audit output; recheck again by the 2026-06-09 expiry or sooner if `drizzle-kit` releases a fix. Evidence: `TEST-20260510T073945Z-dependency-audit-baseline-recheck`.
- Codex config deprecation warnings were handled at the policy/engine layer on 2026-05-10: Nexus now uses `features.hooks`, rejects deprecated hook/windows-sandbox aliases, and records the architecture reasoning in `.codex/workflow/research/workflow-architecture-recheck-2026-05-10.md`.
- Remaining design-system risk is contrast coverage beyond primary-colored surfaces: the primary contract is now linted and validated, but every possible non-primary foreground/background pair across all themes is not exhaustively proven. Treat `.codex/knowledge/design-system.md` as active truth and archived Claude notes or frozen `design/reference/v1/` docs as historical evidence until reconciled.
