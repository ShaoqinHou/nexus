# Workflow Kernel Self-Check Audit

Date: 2026-05-10

## Question

The workflow had grown several safeguards. The user asked whether this was becoming patch-on-patch design, and required a deeper pass over `.codex/` file placement, policy execution, failure-path tests, trace timing, and the remaining hook-runtime risk.

## Parallel Audit Inputs

- `.codex` inventory audit: found the archived Claude tree was correctly quarantined, but an old dated screenshot folder under `.codex/workflow/artifacts/screenshots/20260509-workflow-guide-visible/` had no active references.
- Policy/test audit: found the policy split was not yet fully executable truth. `gates.json` was not checked against package/docs, `files.json` omitted critical workflow scripts from `requiredWorkflowFiles`, the reusable engine had weak fixture coverage, and command trace failure paths were only helper-level tests.
- Hook/config audit: confirmed `.codex/config.toml` should remain per-project. The remaining `hook runtime: not seen` risk is a Codex client trust/loading boundary, not something the repository can force. The repo can provide config, hooks, diagnostics, and deterministic gates.

## Design Decision

Keep one deterministic kernel instead of adding more ad hoc checklists.

The workflow now treats these as first-class kernel checks:

- `workflow:inventory-check`: every durable `.codex/` file is categorized by policy; active Claude files, tracked runtime state, unknown policy files, unmanaged artifacts, and missing manifest entries fail.
- `workflow:policy-check`: the policy pack is validated against loaded policy names, package scripts, canonical ladder docs, required files, guide source inputs, deployment URLs, and table-driven file classifier cases.
- `workflow:trace-check`: command-run telemetry must be parseable and structurally complete; self-tests exercise success, warning threshold, timeout, failed commands, duplicate command ids, and malformed JSONL.

These checks are wired into `workflow:health` and `workflow:release-gate`. They are not a second closeout process.

## Fixes Made

- Removed the unreferenced `20260509-workflow-guide-visible` screenshot folder.
- Added `.codex/workflow/templates/project-bootstrap.md` so a future project has a concrete, project-local `.codex/config.toml` bootstrap route.
- Added missing workflow scripts and docs to `requiredWorkflowFiles`.
- Added `.codex` inventory policy to `.codex/workflow/policy/files.json`.
- Excluded archived Claude files and deployment/guide-browser records from guide-change triggers where they should not self-stale generated guide evidence.
- Fixed `workflow-engine.mjs` globstar matching so path policy can safely use `**`.
- Replaced hardcoded visual Zoo/Gym deployment URL copy in generated guides with `deployment.json`.
- Added self-test fixture coverage for the reusable engine, policy checks, inventory checks, command trace warnings/timeouts/failures, duplicate command ids, and malformed telemetry.

## Hook Runtime Risk

`hook runtime: not seen` is not fixed by choosing Full access. Full access grants no-prompt permission for this session, but it does not prove project config/hooks loaded.

Best available enforcement:

1. Use `Custom (config.toml)` in a trusted project when hook loading matters.
2. Keep `.codex/config.toml` and `.codex/hooks.json` checked in.
3. Run `workflow:hook-config-check` to verify repo config.
4. Run `workflow:hook-runtime-check` to diagnose whether the current Codex client/session fired hooks.
5. Rely on `workflow:release-gate` and CI/server scripts for enforcement even when hooks are absent.

This keeps hooks as thin triggers and prevents hook loading from becoming the single point of failure.

## Evidence

After implementation:

- `node --check .codex/scripts/workflow-engine.mjs`
- `node --check .codex/scripts/nexus-workflow.mjs`
- `npm run workflow:inventory-check`
- `npm run workflow:policy-check`
- `npm run workflow:trace-check`
- `npm run workflow:self-test`
- `npm run workflow:health`

The first `self-test` run caught a real bug in globstar matching. The engine was fixed and the self-test passed with 141 checks.
