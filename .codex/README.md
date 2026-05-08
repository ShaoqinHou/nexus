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
- `knowledge/deployment.md` captures server and deployment conventions.
- `agents/*.toml` defines project-scoped Codex subagents.
- `scripts/nexus-workflow.mjs` is the deterministic workflow helper.
- `scripts/validate-design-zoo.mjs` validates the running `/design` zoo through Playwright.
- `hooks.json` wires Codex lifecycle hooks when project hooks are enabled and trusted.
- `workflow/templates/` describes record shapes for humans and agents.

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
- `workflow/records/patches/`
- `workflow/records/reviews/`
- `workflow/records/tests/`
- `workflow/records/deployments/`
- `workflow/records/risks.md`

Do not paste long transcripts into `current-state.md`. Link to records instead.

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
