# Hook Policy And Limits

Hooks are guardrails, not the workflow brain. They must stay small and understandable.

## Current Hook Setup

- `.codex/config.toml` enables `features.codex_hooks = true`.
- `.codex/config.toml` also pins `sandbox_mode = "danger-full-access"` and `approval_policy = "never"` so choosing `Custom (config.toml)` keeps the same no-prompt shell posture as Full access while adding project config.
- `.codex/hooks.json` wires lifecycle events to `.codex/scripts/nexus-workflow.mjs`.
- `workflow:hook-config-check` verifies exact hook commands and matchers, so a hook cannot silently stop firing by changing `Bash`, `apply_patch`, `Edit`, `Write`, or session match patterns.
- `workflow:hook-runtime-check` checks whether this checkout has actually seen a recent hook heartbeat. It is a local-session diagnostic, not a CI release gate.
- `SessionStart` injects a compact reminder to read current state.
- `PostToolUse` invalidates gates only when the tool payload identifies changed files. It does not assign worker identity; delegated work must be recorded explicitly with `record-patch --worker --routing`.
- `PreToolUse` blocks common `git commit` shell invocations if review is missing.
- `Stop` reminds when review, verification, audit, or handover hygiene is missing.

Review, verification, audit, pattern judgment, and model routing stay outside hooks.

The shared deterministic layer is `.codex/scripts/nexus-workflow.mjs`. Hooks should call that layer for trigger/block/remind behavior. They should not become separate workflow engines, because that would split handover, review, audit, routing, and guide logic across too many places.

Hooks call `.codex/scripts/run-hook.mjs <event>` and nothing else. `run-hook.mjs` is a tiny dispatcher to `nexus-workflow.mjs hook <event>` so hook JSON remains readable and the hook-config check can reject inline shell logic.

## Trust And Loading

The repo can provide hook config, but it cannot force every Codex client/session to trust and load that config. That is a security boundary: a repository should not be able to silently make arbitrary local hooks run for every user.

Current Codex behavior checked on 2026-05-09:

- User config lives in `~/.codex/config.toml`.
- Project-scoped overrides can live in `<repo>/.codex/config.toml`.
- Codex loads project-scoped config and project-local hooks only when the project is trusted.
- Hooks need `features.codex_hooks = true`.
- Runtime permission mode such as Full access controls what this session may do; it does not prove future sessions will trust project hooks.

`Full access` is the simplest no-prompt mode, but it can bypass project config if the app is not using the repo config. `Custom (config.toml)` should also avoid permission prompts in this project because the repo config sets `sandbox_mode = "danger-full-access"` and `approval_policy = "never"`. Custom is the better Nexus default when the project is trusted because it combines no-prompt execution with project hooks, agents, and feature toggles.

If Custom starts prompting, treat that as a client/config/trust issue and fall back to Full access plus the deterministic workflow scripts. Do not weaken release gates to compensate.

Current mitigation:

- Project config and hooks are checked in.
- `AGENTS.md` tells agents to run workflow scripts at start and before handover.
- `npm run workflow:release-gate` is deterministic and does not depend on hook loading.
- The public/internal guides point humans to the same scripts.
- `npm run workflow:hook-runtime-check` can confirm whether hooks actually fired in the current checkout.

Operational rule: if hooks do not appear to run, continue with the scripts. Do not treat hooks as the only enforcement mechanism.

## Thin Hook Examples

Good hook responsibilities:

- `SessionStart`: inject a small pointer to `.codex/workflow/current-state.md` and `workflow:status`.
- `PostToolUse`: notice a structured file-edit payload and invalidate review/verify/audit gates for the current worktree hash.
- `PreToolUse`: deny common `git commit` shell forms when review is stale.
- `Stop`: remind the lead when review, verification, audit, or handover checks are still missing.

Bad hook responsibilities:

- Running a full code review prompt inside a hook.
- Deciding whether a theme cascade implementation is correct.
- Doing deployment diagnosis or SSH validation.
- Promoting dynamic pattern discoveries directly into durable guidance.
- Writing long handover prose from hook context.

The hook can trigger, invalidate, or block obvious unsafe flow. The lead, focused agents, skills, and deterministic scripts own the judgment and records.

## Commit Hook Examples

The commit gate is expected to deny these when the current substantive tree lacks passing review:

- `git commit -m test`
- `git.exe commit -m test`
- `"git" commit -m test`
- `& "git" commit -m test`
- `git -C C:/repo commit -m test`
- `git --git-dir=C:/repo/.git --work-tree=C:/repo commit -m test`
- `cmd /c "git commit -m test"`

It is expected to allow output-only commands:

- `echo git commit -m test`
- `Write-Host git commit -m test`
- `git status commit`

## Known Interception Limits

Hooks may miss or intentionally ignore:

- commits made outside Codex, such as IDE UI commits or direct Git GUI actions,
- unusual wrapper scripts that eventually call Git,
- shell commands that edit files without a structured patch payload,
- file changes made by external processes while the agent is running,
- server-side edits after local validation.

The workflow handles those limits through hashes and gates:

- `npm run workflow:status` shows a cheap resume snapshot and writes a runtime session checkpoint.
- `npm run workflow:health` runs heavier local diagnostics.
- `npm run workflow:review-check` checks the current worktree hash.
- `npm run workflow:verify-check` checks verification-relevant changes.
- `npm run workflow:audit-check` checks audit-relevant changes.
- `npm run workflow:handover-check` checks stale handover wording.
- `npm run workflow:release-gate` combines the required checks.
- `npm run workflow:hook-config-check` verifies the checked-in config is pinned for hooks and no-prompt custom permissions.
- `npm run workflow:hook-runtime-check` reports whether local hooks have actually fired.

Best enforcement stack:

- Deterministic kernel checks under `nexus-workflow.mjs`.
- CI/server/package scripts that call those checks.
- Thin Codex hooks as reminders, invalidators, and obvious commit blockers.
- AGENTS/skills/records as the human/agent process layer.

Hooks are intentionally not the highest-enforcement layer. They improve the Codex session ergonomics, but the release gate and CI are the enforcement that still works when hooks are missing, stale, or bypassed.

## Hook Design Rule

If a hook starts needing project-specific reasoning, long prompts, source-code review, or deployment logic, move that logic into:

- `.codex/scripts/nexus-workflow.mjs` for deterministic checks,
- `.codex/knowledge/` for durable guidance,
- `.agents/skills/` for reusable agent process,
- `.codex/workflow/records/` for evidence.
