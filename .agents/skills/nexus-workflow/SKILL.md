---
name: nexus-workflow
description: Start, resume, or coordinate Nexus work using the Codex-native workflow. Use when a task needs project context, long-running bookkeeping, patch/review records, model routing, handover updates, or any non-trivial implementation in this repo.
---

# Nexus Workflow

## Start

1. Read `AGENTS.md`.
2. Read `.codex/README.md`.
3. Read `.codex/workflow/current-state.md`.
4. Run `node .codex/scripts/nexus-workflow.mjs status`.
5. Load only the relevant file from `.codex/knowledge/`.

## During Work

- Record durable decisions with `node .codex/scripts/nexus-workflow.mjs record-decision --summary "<summary>" --notes "<notes>"`.
- Record discovered pattern candidates with `node .codex/scripts/nexus-workflow.mjs record-pattern --summary "<finding>" --evidence "<files/tests/reviews>" --guidance "<candidate rule>"`.
- Record manual patch slices with `node .codex/scripts/nexus-workflow.mjs record-patch --summary "<summary>" --files "a,b"`.
- Hook-triggered patch state is only a compact invalidation signal. Create an explicit patch record for meaningful work slices before review or handover.
- Keep `.codex/workflow/current-state.md` compact and link detailed records instead of pasting long logs.
- Use subagents only when the task is independently useful and has a clear scope.

## Before Commit

1. Run targeted tests.
2. Run `node .codex/scripts/nexus-workflow.mjs review-check`.
3. Use `nexus-review` if a focused review is needed.
4. Record a passing review:
   `node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --verdict pass --reviewer <name> --notes "<summary>"`
5. Run `node .codex/scripts/nexus-workflow.mjs validate --commit-gate`.

## Before Final Handover Or Release

Review, verify, and audit are automatic workflow gates, not only user-invoked skills.

1. Run `node .codex/scripts/nexus-workflow.mjs verify-check`.
2. Run `node .codex/scripts/nexus-workflow.mjs audit-check`.
3. Use `nexus-verify` and `nexus-audit` when evidence is missing.
4. Record passing evidence with `record-verify` and `record-audit`.
5. Run `node .codex/scripts/nexus-workflow.mjs validate --release-gate`.

## Handover

Update `.codex/workflow/current-state.md` with:

- current phase,
- changed files,
- tests and review records,
- deployment state,
- risks and next step.
