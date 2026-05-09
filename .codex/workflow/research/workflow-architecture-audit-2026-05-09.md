# Workflow Architecture Audit - 2026-05-09

## Purpose

Nexus workflow exists to prove three things without relying on chat memory:

- what changed,
- who judged or executed the relevant step,
- what validation level passed.

The workflow should be easy to execute every time. If a rule matters, the deterministic kernel should report the missing evidence rather than depending on a lead agent remembering a long checklist.

## Outside Systems Checked

- GitHub branch protection: protected branches enforce workflows through required reviews and status checks before merge. Useful pattern: keep merge/release enforcement in a central gate, not scattered local reminders.
- Kubernetes admission control and OPA Gatekeeper: admission checks are invoked before mutation, and policy is decoupled from the request path. Useful pattern: hooks should be thin admission/reminder triggers; policy lives in the kernel.
- in-toto: a layout defines expected steps, functionaries, materials, and products; link metadata proves each step happened. Useful pattern: branch/worktree records are lightweight attestations, and the verifier checks required links.
- Codex agent loop/compaction: Codex context can compact during long threads, so durable project-local records are safer than conversation memory.

## Adopted Nexus Model

- Records plus git/worktree/branch state are truth.
- `.codex/workflow/state/` is cache only and must be delete-safe.
- `.codex/workflow/runtime/` is local telemetry only.
- Generated dashboards/guides are views and deployable documentation, not the core source of truth.
- `status` is a cheap resume snapshot.
- `health`, `release-gate`, and `deployed-gate` are heavier deterministic gates.
- Worktree-scope records do not carry branch hashes.
- Branch hashes belong to branch-scope closing records.
- Delegated worker evidence is explicit: `record-routing`, `record-patch --worker --routing`, `complete-routing`, then integrated review.
- Deployment proof is separate from local release readiness.

## Follow-Up Implications

- Avoid adding new checks directly to hooks unless they are thin triggers.
- Prefer adding verifier predicates to `.codex/scripts/nexus-workflow.mjs` and record fields the kernel can inspect.
- Add new generated guide views only when they clarify records or code structure; do not make views a second state system.
