# Nexus Codex Workflow

This is the project-local workflow root for Codex sessions.

## Start Here

1. Read `workflow/current-state.md`.
2. Run `node .codex/scripts/nexus-workflow.mjs status`.
3. Load only the relevant knowledge file from `knowledge/`.
4. Record decisions, patches, reviews, tests, and deployments under `workflow/records/`.

## Navigation

- `workflow/briefs/2026-05-09-original-user-brief.md` preserves the original migration request.
- `workflow/current-state.md` is the compact resumable state.
- `workflow/research/codex-capabilities-2026-05-09.md` records the Codex behavior research.
- `knowledge/patterns.md` captures durable project patterns and traps.
- `knowledge/design-system.md` captures the design-system source of truth and invariants.
- `knowledge/model-routing.md` captures lead/worker routing, Spark limits, strong-worker usage, and fallback rules.
- `knowledge/hooks.md` captures what hooks do, what they cannot catch, and how deterministic gates cover the gaps.
- `knowledge/verification.md` captures evidence policy for tests, browser checks, screenshots, and deployment validation.
- `knowledge/deployment.md` captures server and deployment conventions.
- `agents/*.toml` defines project-scoped Codex subagents.
- `scripts/nexus-workflow.mjs` is the deterministic workflow helper.
- `scripts/audit-deps.mjs` runs `npm audit` with an explicit expiring baseline for known dev-only advisories.
- `scripts/check-production-zoo-bundle.mjs` checks production build output does not ship the interactive dev-only Zoo route/chunk.
- `scripts/validate-design-zoo.mjs` validates the running `/design` zoo through Playwright.
- `scripts/capture-design-zoo-visuals.mjs` captures the live `/design` zoo into the deployable visual guide at `dashboard/zoo/index.html`.
- `scripts/run-hook.mjs` is the only command hooks call; it forwards hook events to the workflow kernel.
- `hooks.json` wires Codex lifecycle hooks when project hooks are enabled and trusted.
- `.github/workflows/nexus-workflow-gates.yml` runs the same workflow gates in CI so enforcement is not hook-only.
- `workflow/templates/` describes record shapes for humans and agents.
- `npm run workflow:guide-browser-finalize` is the deterministic final guide-evidence step. Run it after review, verification, and audit records are in place; it regenerates guide artifacts, captures browser evidence, and records the hash-bound guide-browser pass.

## Workflow Kernel

The center of the system is `scripts/nexus-workflow.mjs`. Treat it as the deterministic workflow kernel:

- records are its durable state,
- hooks, package scripts, local/server validation, and future CI should call it instead of duplicating logic,
- LLMs supply judgment by creating review, verification, audit, routing, and pattern-proposal records,
- the kernel decides whether required records exist, hashes match, guide artifacts are current, and release gates can pass.
- state JSON files are caches only; gates cross-check them against append-only markdown records before trusting a pass.
- record integrity also checks committed evidence-record history against the configured base branch when available, so old records must be corrected by adding a new record instead of rewriting the old one.

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
- `workflow/records/pattern-proposals/`
- `workflow/records/routing/`
- `workflow/records/patches/`
- `workflow/records/reviews/`
- `workflow/records/tests/`
- `workflow/records/audits/`
- `workflow/records/guide-browser/`
- `workflow/records/deployments/`
- `workflow/records/risks.md`

Do not paste long transcripts into `current-state.md`. Link to records instead.

## Handover Policy

`workflow/current-state.md` is a managed compact handover, not a scratch note. It should hold stable resume facts and links to detailed records. Do not put self-staling finalization facts there, such as exact "final workflow record commit" lines or pending "commit/push/pull this handover update" tasks.

Before final handover, run:

```bash
npm run workflow:records-check
npm run workflow:routing-check
npm run workflow:guide-check
npm run workflow:guide-browser-check
npm run workflow:zoo-check
npm run workflow:zoo-visual-guide-check
npm run workflow:hook-config-check
npm run workflow:dependency-audit-check
npm run workflow:prod-zoo-bundle-check
npm run workflow:handover-check
npm run workflow:self-test
npm run workflow:release-gate
```

Pattern proposal, routing, patch, review, test, audit, guide-browser, and deployment records are append-only once committed. If a record is wrong, create a correction record rather than editing committed evidence. `NEXUS_RECORD_BASE=<ref>` can be used to force the base ref for append-only history checks; otherwise the kernel uses `origin/main` or `main` when present.

`.codex/dashboard/index.html` and `.codex/dashboard/public.html` are generated guide artifacts and user-facing workflow surfaces. They are governed by the dedicated guide freshness/content-hash gate and recorded browser validation; their generator, source docs, state files, records, and workflow rules remain part of the substantive review surface.

If final deployment or records create more commits after the runtime build, describe that as "branch HEAD" or link to the deployment record instead of hardcoding a final commit that the next bookkeeping commit can invalidate.

Guide-browser evidence is intentionally generated as one atomic workflow step. Avoid manually recording browser evidence before review, verification, audit, and generated-guide updates are settled; any later guide-affecting record or script change correctly invalidates the previous artifact hash. Use:

```bash
npm run workflow:guide-browser-finalize
```

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

The script checks the `/design` index, Toast showcase, warning toast interaction, dark-mode toggle, non-classic theme selection, the Zoo `data-theme` wrapper, and `document.body` theme mirroring for portal inheritance. Set `NEXUS_WEB_URL` if the local server is not at `http://localhost:5173`.

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
