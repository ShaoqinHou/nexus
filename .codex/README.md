# Nexus Codex Workflow

This is the project-local workflow root for Codex sessions.

## Start Here

1. Read `workflow/current-state.md`.
2. Run `npm run workflow:status`.
3. Load only the relevant knowledge file from `knowledge/`.
4. Record decisions, patches, reviews, tests, and deployments under `workflow/records/`.

## Workflow Ladder

Use one canonical route:

1. `npm run workflow:status` for the cheap resume snapshot.
2. `npm run workflow:health` when diagnosing a complex, stale, or surprising session.
3. `npm run workflow:release-gate` before committing or handing over local work.
4. `npm run workflow:deployed-gate` after hosted/server validation when deployment is in scope.

Other workflow commands are helpers for creating evidence records or diagnosing a failed gate. Do not treat them as a second closeout process.

For workflow migration, architecture changes, or second-project setup, read `workflow/principles.md` and `workflow/capabilities.md` before editing scripts or policy. They define the intended separation between reusable mechanics, project-specific data, durable evidence, generated views, hooks, skills, and optional capabilities.

## Navigation

- `workflow/briefs/2026-05-09-original-user-brief.md` preserves the original migration request.
- `workflow/principles.md` is the base workflow design, responsibility map, loose-document policy, and second-project portability guide for humans and agents.
- `workflow/capabilities.md` maps required and optional workflow capabilities to their policy, scripts, guide sections, records, gates, and porting rules.
- `workflow/current-state.md` is the compact resumable state.
- `workflow/profile.json` declares reusable workflow roots, generated surfaces, and project identity.
- `workflow/policy/*.json` is the project-specific policy pack consumed by the workflow engine.
- `workflow/research/codex-capabilities-2026-05-09.md` records the Codex behavior research.
- `workflow/research/workflow-engine-profile-extraction-2026-05-10.md` records the first reusable engine/profile extraction boundary.
- `workflow/templates/project-bootstrap.md` is the portable bootstrap checklist for creating `.codex/config.toml`, hooks, profile, and policy in a second project.
- `knowledge/patterns.md` captures durable project patterns and traps.
- `knowledge/design-system.md` captures the design-system source of truth and invariants.
- `knowledge/work-intake.md` captures solo-dev user-intent and lead work-slice traceability.
- `knowledge/model-routing.md` captures lead/worker routing, Spark limits, strong-worker usage, and fallback rules.
- `knowledge/hooks.md` captures what hooks do, what they cannot catch, and how deterministic gates cover the gaps.
- `knowledge/verification.md` captures evidence policy for tests, browser checks, screenshots, and deployment validation.
- `knowledge/deployment.md` captures server and deployment conventions.
- `agents/*.toml` defines project-scoped Codex subagents.
- `scripts/workflow-engine.mjs` is the reusable loader/path-policy layer for Codex workflow profiles.
- `scripts/nexus-workflow.mjs` is the Nexus wrapper and deterministic workflow helper.
- `scripts/audit-deps.mjs` runs `npm audit` with an explicit expiring baseline for known dev-only advisories.
- `scripts/check-public-guide-images.mjs` validates the deployed public workflow guide and Zoo/Gym screenshot image responses.
- `scripts/check-production-zoo-bundle.mjs` checks production build output does not ship the interactive dev-only Zoo route/chunk.
- `scripts/validate-design-zoo.mjs` validates the running `/design` zoo through Playwright.
- `scripts/capture-design-zoo-visuals.mjs` captures the live `/design` zoo into the deployable visual guide at `dashboard/zoo/index.html`.
- `scripts/run-hook.mjs` is the only command hooks call; it forwards hook events to the workflow kernel.
- `hooks.json` wires Codex lifecycle hooks when project hooks are enabled and trusted.
- `.github/workflows/nexus-workflow-gates.yml` runs the same workflow gates in CI so enforcement is not hook-only.
- `workflow/templates/` describes record shapes for humans and agents.
- `workflow/artifacts/` stores bounded screenshots and summaries referenced by records or generated visual guides. These are evidence attachments, not canonical memory, and should not be copied to new projects as live state.
- `workflow/state/` stores mutable workflow cache JSON. It is not durable evidence.
- `workflow/runtime/` stores operational telemetry, hook heartbeats, PIDs, and local logs. It is not durable evidence.
- `npm run workflow:status`, `npm run workflow:health`, `npm run workflow:release-gate`, and `npm run workflow:deployed-gate` are the public workflow ladder.
- `npm run workflow:inventory-check`, `npm run workflow:policy-check`, and `npm run workflow:trace-check` are deterministic checks for workflow file placement, policy consumption, and command execution telemetry.
- `npm run workflow:work-intake-check` validates user-intent/work-slice traceability, orphan patch coverage, stale active slices, and optional external tracker references.
- `npm run workflow:guide-browser-finalize` is the deterministic final guide-evidence step when guide artifacts are in scope. Run it after review, verification, and audit records are in place; it regenerates guide artifacts, captures browser evidence, and records the hash-bound guide-browser pass.

## Workflow Kernel

The center of the system is the deterministic kernel exposed through `scripts/nexus-workflow.mjs`, with reusable profile loading and path policy helpers in `scripts/workflow-engine.mjs`. Nexus-specific facts live in `workflow/profile.json` and `workflow/policy/*.json`.

- records are its durable state,
- hooks, package scripts, local/server validation, and future CI should call it instead of duplicating logic,
- LLMs supply judgment by creating review, verification, audit, routing, and pattern-proposal records,
- the kernel decides whether required records exist, hashes match, guide artifacts are current, and release gates can pass.
- file classifiers, review-kind classifiers, required files, record schemas, hook expectations, guide contracts, deployment URLs, and design-system source inputs should be changed in the policy pack before changing kernel code.
- passing verification, audit, and deployment records embed compact command-run summaries from the timed runner, so gates validate durable command evidence instead of trusting mutable runtime telemetry.
- state JSON files under `workflow/state/` are caches only; gates cross-check them against append-only markdown records before trusting a pass.
- record integrity also checks committed evidence-record history against the configured base branch when available, so old records must be corrected by adding a new record instead of rewriting the old one.
- branch evidence checks compare the current branch diff against its base and require hash-bound branch-scope patch, review, verification, and audit records even on a clean checkout.
- Worktree-scope records should not carry branch hashes. Branch hashes belong to final branch-scope records. Delegated worker patch records introduced on the branch remain branch evidence through routing id plus integrated review, even if later lead edits change the final branch hash.
- `.codex/` inventory, policy consumption, and command trace telemetry are first-class release-gate inputs. This keeps workflow self-checks centralized in the kernel instead of relying on scattered handover reminders.
- Work Intake records connect user prompts to lead work slices and then to implementation evidence. Substantive records should carry `workSliceIds` so generated guide views and release gates can detect drift.
- `.codex/workflow/policy/files.json` `inventory.roleTaxonomy` owns the file/directory role map. Use it to distinguish system code, policy/profile data, workflow docs, append-only records, generated artifacts, mutable cache, and historical research before copying or editing workflow files.
- Records should preserve enough structured frontmatter for gates while keeping bodies compact for humans and LLMs. Branch patch records own the complete branch file list; branch review, verification, audit, and deployment records should reference the branch hash and linked patch instead of repeating the full file inventory.

When the kernel needs LLM judgment, it should fail with a specific missing-record message rather than hide judgment inside a hook. Add new workflow rules to the kernel and records first; keep skills and docs as concise usage guidance around that shared system.

Dependency audit follows the same rule. `npm run audit:deps` wraps raw `npm audit` with `.codex/workflow/dependency-audit-baseline.json`; any exception must be explicit, dev-only or otherwise justified, path/via/effect/advisory-source-bound, currently used, and expiring. Changing the baseline is substantive work that requires review, verification, and audit evidence. Evidence: `PATTERN-PROPOSAL-20260509T094331Z-pattern-accepted-dependency-audit-exceptions-mus`.

## Hook Policy

Hooks are triggers, not reviewers. They may:

- inject compact current-state context on session start,
- record a compact pending-patch trigger and invalidate review/verify/audit gates,
- block `git commit` when substantive changes do not have a passing review record,
- remind the lead at stop time when review, verification, or audit evidence is missing.

Hooks must not contain project judgment, LLM review prompts, long checklists, or domain-specific reasoning. That work belongs in skills, agents, knowledge files, and explicit review/test/audit records.

## Record System

Core handover context stays small. Detailed records live below:

- `workflow/records/decisions/`
- `workflow/records/intents/`
- `workflow/records/work-slices/`
- `workflow/records/pattern-proposals/`
- `workflow/records/routing/`
- `workflow/records/patches/`
- `workflow/records/reviews/`
- `workflow/records/tests/`
- `workflow/records/audits/`
- `workflow/records/guide-browser/`
- `workflow/records/deployments/`
- `workflow/records/risks.md`

Do not put mutable cache JSON in `workflow/records/`. Do not paste long transcripts into `current-state.md`. Link to records instead.

## Work Intake

Work Intake is the solo-dev traceability layer:

`user intent -> lead work slice -> patch -> review -> verify -> audit -> deployment`

Use `record-intent` for compact user meaning and `record-work-slice` for the lead's implementable interpretation. External trackers can be referenced with `externalRefs`, but local records stay canonical unless a future project policy explicitly changes that. Generated guide pages show the inbox, active slices, trace graph, feature catalog, and deterministic warnings.

## Handover Policy

`workflow/current-state.md` is a managed compact handover, not a scratch note. It should hold stable resume facts and links to detailed records. Do not put self-staling finalization facts there, such as exact "final workflow record commit" lines or pending "commit/push/pull this handover update" tasks.

Before final local handover, run the canonical gate:

```bash
npm run workflow:release-gate
```

If it fails, run `npm run workflow:health` for the diagnostic breakdown. The release gate covers records, routing, generated guides, guide-browser evidence, Zoo/Gym evidence, `.codex` inventory, workflow policy, command trace telemetry, hook config, branch evidence, dependency-audit baseline, production Zoo bundling, handover hygiene, and workflow self-tests.

Pattern proposal, routing, patch, review, test, audit, guide-browser, and deployment records are append-only once committed. If a record is wrong, create a correction record rather than editing committed evidence. `NEXUS_RECORD_BASE=<ref>` can be used to force the base ref for append-only history checks; otherwise the kernel uses `origin/main` or `main` when present.

`.codex/dashboard/index.html` and `.codex/dashboard/public.html` are generated guide artifacts and user-facing workflow surfaces. They are snapshots, not live truth. Live worktree truth comes from `npm run workflow:status`. Generated guide artifacts are governed by the dedicated guide freshness/content-hash gate and recorded browser validation; their generator, source docs, records, and workflow rules remain part of the substantive review surface. Deployment records are gate-only for generated guide artifacts, because embedding the record proving a guide deployment would make that same guide stale.

Generated guides should be deterministic for the same input files. Do not embed wall-clock generation timestamps; show source/content hashes instead so a harmless rerun does not stale deployment proof.

For the same reason, Work Intake guide traces and generated-guide warnings use policy-owned self-referential exclusions and omit current deployment proof. Deployment proof remains in append-only deployment records plus `workflow:deployed-gate`; do not force the current deployment record into the guide artifact that the record validates. Generated guides can point to deployment proof, but the gate is the source of truth for current deployment state.

If final deployment or records create more commits after the runtime build, describe that as "branch HEAD" or link to the deployment record instead of hardcoding a final commit that the next bookkeeping commit can invalidate.

`release-gate` proves local branch readiness. Server publication is a separate proof step:

```bash
npm run workflow:deployment-check
npm run workflow:deployed-gate
```

Use `deployed-gate` when the task includes server validation or after a release has been pushed to the host. A passing deployment record needs command evidence or durable artifacts; freeform checks document the inspection but do not satisfy the gate by themselves.

Guide-browser evidence is intentionally generated as one atomic workflow step. Avoid manually recording browser evidence before review, verification, audit, and generated-guide updates are settled; any later guide-affecting record or script change correctly invalidates the previous artifact hash. Use:

```bash
npm run workflow:guide-browser-finalize
```

When closing a branch, record the whole branch diff explicitly instead of relying on a small worktree patch record:

```bash
node .codex/scripts/nexus-workflow.mjs close-work-slice --slice <WORK-SLICE-id> --status done --notes "<evidence complete>"
node .codex/scripts/nexus-workflow.mjs record-patch --scope branch --summary "<branch summary>" --worker <lead-worker> --work-slice <WORK-SLICE-id>
node .codex/scripts/nexus-workflow.mjs record-review --scope branch --kind general --verdict pass --reviewer <name> --work-slice <WORK-SLICE-id> --notes "<summary>"
node .codex/scripts/nexus-workflow.mjs record-verify --scope branch --verdict pass --verifier <name> --work-slice <WORK-SLICE-id> --commands "<timed-command-ids>" --notes "<commands/results>"
node .codex/scripts/nexus-workflow.mjs record-audit --scope branch --verdict pass --auditor <name> --work-slice <WORK-SLICE-id> --commands "<timed-command-ids>" --notes "<summary>"
```

If the branch touches workflow or design-system files, record the matching `workflow` or `design` branch review too. If the branch includes delegated worker patch evidence, record an `integrated` branch review as well. The release gate prints the missing branch-scope kind when a focused review is required. Branch release also requires each work slice linked to the branch patch to be closed with a latest status of `verified`, `done`, `deferred`, or `superseded`.

## Pattern Discovery

Durable project guidance is not a dumping ground. When an agent finds a repeated mistake, an undocumented invariant, or a deprecated local pattern, it should create a pattern proposal first:

```bash
node .codex/scripts/nexus-workflow.mjs record-pattern --summary "<finding>" --evidence "<files/tests/reviews>" --guidance "<candidate rule>"
```

Promote the proposal into `knowledge/` only after checking the code, reference material, tests, or git history. The dashboard shows open proposals so reviews and audits can decide whether they deserve promotion, rejection, or more evidence.

## Design Zoo Validation

Start the web dev server first:

```bash
npm run dev:web
```

Then run:

```bash
npm run workflow:design-zoo
```

The script checks the `/design` index, Toast showcase, warning toast interaction, dark-mode toggle, non-classic theme selection, the Zoo `data-theme` wrapper, `document.body` theme mirroring, and dialog/tour portal inheritance. The local server URL env name is defined in `workflow/profile.json` (`env.webUrl`; Nexus uses `NEXUS_WEB_URL`).

## Visual Zoo Guide

The deployable guide uses screenshots captured from the live dev-only `/design` routes:

```bash
npm run dev:web
npm run workflow:capture-zoo-visuals
npm run workflow:zoo-visual-guide
npm run workflow:zoo-visual-guide-check
```

The generated surface is `.codex/dashboard/zoo/index.html` and deploys under `https://cv.rehou.games/nexus/workflow/zoo/`. Production `/nexus/design` stays dev-only; the screenshot guide is the production-safe visual surface.

The default capture records two contexts, desktop/light and mobile/dark, for every registry-backed Zoo page. Captures are full-page, the mobile Zoo layout must keep demo content visible, and the generated guide shows screenshots without cropping the source evidence. The visual guide freshness hash includes the registry, Zoo route, theme files, and component source files so component changes invalidate stale screenshots.
