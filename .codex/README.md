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
- `knowledge/deployment.md` captures server and deployment conventions.
- `agents/*.toml` defines project-scoped Codex subagents.
- `scripts/nexus-workflow.mjs` is the deterministic workflow helper.
- `scripts/validate-design-zoo.mjs` validates the running `/design` zoo through Playwright.
- `hooks.json` wires Codex lifecycle hooks when project hooks are enabled and trusted.
- `workflow/templates/` describes record shapes for humans and agents.

## Workflow Kernel

The center of the system is `scripts/nexus-workflow.mjs`. Treat it as the deterministic workflow kernel:

- records are its durable state,
- hooks, package scripts, local/server validation, and future CI should call it instead of duplicating logic,
- LLMs supply judgment by creating review, verification, audit, routing, and pattern-proposal records,
- the kernel decides whether required records exist, hashes match, guide artifacts are current, and release gates can pass.

When the kernel needs LLM judgment, it should fail with a specific missing-record message rather than hide judgment inside a hook. Add new workflow rules to the kernel and records first; keep skills and docs as concise usage guidance around that shared system.

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
npm run workflow:handover-check
npm run workflow:self-test
npm run workflow:release-gate
```

Pattern proposal, routing, patch, review, test, audit, and deployment records are append-only once committed. If a record is wrong, create a correction record rather than editing committed evidence.

`.codex/dashboard/index.html` and `.codex/dashboard/public.html` are generated guide artifacts and user-facing workflow surfaces. They are governed by the dedicated guide freshness/content-hash gate and recorded browser validation; their generator, source docs, state files, records, and workflow rules remain part of the substantive review surface.

If final deployment or records create more commits after the runtime build, describe that as "branch HEAD" or link to the deployment record instead of hardcoding a final commit that the next bookkeeping commit can invalidate.

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

The script checks the `/design` index, Toast showcase, warning toast interaction, dark-mode toggle, and non-classic theme selection. Set `NEXUS_WEB_URL` if the local server is not at `http://127.0.0.1:5173`.
