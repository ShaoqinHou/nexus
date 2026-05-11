---
name: nexus-workflow
description: Start, resume, or coordinate Nexus work using the Codex-native workflow. Use when a task needs project context, long-running bookkeeping, patch/review records, model routing, handover updates, or any non-trivial implementation in this repo.
---

# Nexus Workflow

## Start

1. Read `AGENTS.md`.
2. Read `.codex/README.md`.
3. Read `.codex/workflow/current-state.md`.
4. Run `npm run workflow:status`.
5. Load only the relevant file from `.codex/knowledge/`.

For workflow migration, architecture changes, adapter changes, or second-project setup, read `.codex/workflow/principles.md`, `.codex/workflow/capabilities.md`, `.codex/workflow/system/README.md`, `.codex/workflow/project/README.md`, and `.codex/workflow/templates/project-bootstrap.md` before editing scripts, policy, hooks, fixed instructions, or repo skills.

Use one canonical ladder:

1. `npm run workflow:status` for resume.
2. `npm run workflow:health` for diagnosis when needed.
3. `npm run workflow:release-gate` before commit or local handover.
4. `npm run workflow:deployed-gate` after server validation when deployment is in scope.

Other workflow commands create records or diagnose a failed gate; they should not become a competing checklist.
The release gate includes `.codex` inventory, adapter-drift, policy-consumption, and command-trace checks. Use `workflow:inventory-check`, `workflow:adapter-check`, `workflow:policy-check`, or `workflow:trace-check` only to diagnose those parts directly.

## During Work

- Record durable decisions with `node .codex/scripts/nexus-workflow.mjs record-decision --summary "<summary>" --notes "<notes>"`.
- Record durable user intent slices with `node .codex/scripts/nexus-workflow.mjs record-intent --kind <kind> --status captured --summary "<compact user intent>"`.
- Record lead-interpreted work slices with `node .codex/scripts/nexus-workflow.mjs record-work-slice --intent <INTENT-id> --status active --summary "<lead interpretation>" --acceptance "<done signals>" --verification "<checks>"`.
- Record long lead phases or waits with `node .codex/scripts/nexus-workflow.mjs record-activity --work-slice <WORK-SLICE-id> --kind <policy-phase-kind> --status completed --summary "<phase>" --started-at "<iso>" --ended-at "<iso>"`; the valid phase kinds are owned by `.codex/workflow/policy/intake.json`.
- Link substantive routing, patch, review, verification, audit, and deployment records with `--work-slice <WORK-SLICE-id>`.
- Close each completed slice with `node .codex/scripts/nexus-workflow.mjs close-work-slice --slice <WORK-SLICE-id> --status done --notes "<evidence complete>"` before branch release.
- Record discovered pattern candidates with `node .codex/scripts/nexus-workflow.mjs record-pattern --summary "<finding>" --evidence "<files/tests/reviews>" --guidance "<candidate rule>"`.
- Record manual patch slices with `node .codex/scripts/nexus-workflow.mjs record-patch --summary "<summary>" --files "a,b"`.
- Record non-trivial delegation/routing decisions with `node .codex/scripts/nexus-workflow.mjs record-routing --summary "<task>" --route <route> --worker <agent> --files "a,b" --verification "<commands>" --fallback-trigger "<when>" --fallback-target "<agent>"`.
- Hook-triggered patch state is only a compact invalidation signal. Create an explicit patch record for meaningful work slices before review or handover.
- Keep `.codex/workflow/current-state.md` compact and link detailed records instead of pasting long logs.
- Use `.codex/workflow/policy/files.json` `inventory.roleTaxonomy` before editing or porting workflow files; it separates system code, project adapter sources, policy/profile data, evidence records, generated artifacts, mutable cache/runtime telemetry, and historical research.
- Fixed-path workflow outputs are adapters. Use `.codex/workflow/policy/adapters.json` for the source-owner map: exact-file outputs are edited under `.codex/workflow/project/adapters/`, while package workflow scripts are edited in `.codex/workflow/policy/gates.json` `gates.packageScripts`. Then run `npm run workflow:adapter-check` or `npm run workflow:adapter-sync`; do not leave installed outputs as unmanaged one-off edits.
- Use subagents only when the task is independently useful and has a clear scope.
- For a second project or a fresh Codex setup, start from `.codex/workflow/templates/project-bootstrap.md`. Each project should have its own `.codex/config.toml`; Nexus expects trusted `Custom (config.toml)` for hooks plus no-prompt permissions.

## Before Commit

1. Run targeted tests.
2. Run `node .codex/scripts/nexus-workflow.mjs review-check`.
3. Run `node .codex/scripts/nexus-workflow.mjs work-intake-check` when the work includes user-facing, workflow, design, or product intent traceability.
4. Use `node .codex/scripts/nexus-workflow.mjs activity-check` only to diagnose activity-trace failures reported by health/release gates.
5. Use `nexus-review` if a focused review is needed.
5. Record interim worktree review when useful:
   `node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --kind <general|pattern|design|workflow|integrated> --verdict pass --reviewer <name> --notes "<summary>"`
6. Close branch diffs with branch-scope records before release:
   `close-work-slice`, `record-patch --scope branch --work-slice`, branch-scope review records for every required kind, branch-scope `record-verify --work-slice`, and branch-scope `record-audit --work-slice`.
7. Run `npm run workflow:release-gate`.

## Before Final Handover Or Release

Review, verify, and audit are automatic workflow gates, not only user-invoked skills.

1. Run `node .codex/scripts/nexus-workflow.mjs verify-check`.
2. Run `node .codex/scripts/nexus-workflow.mjs audit-check`.
3. Use `nexus-verify` and `nexus-audit` when evidence is missing.
4. Record passing evidence with branch-scope `record-verify` and `record-audit` for branch release closeout, using timed command ids from `npm run workflow:run` or durable artifact paths.
5. Run `npm run workflow:release-gate`.

Use `status` for a cheap resume snapshot. Use `health` for diagnostics and `release-gate` as the local closeout gate.

Passing verification/audit evidence should reference command ids or artifacts, for example `--commands local-self-test,local-release-gate`.

## Handover

Update `.codex/workflow/current-state.md` only with stable resume facts:

- current phase,
- links to detailed patch/review/verify/audit records,
- deployment state,
- risks and next step.

Do not paste long logs, live command output, exact "final" commit hashes that will stale after another handover commit, or duplicate detailed records. The release gate checks this file for common stale-handover patterns.
