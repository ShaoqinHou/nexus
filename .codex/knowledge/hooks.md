# Hook Policy And Limits

Hooks are guardrails, not the workflow brain. They must stay small and understandable.

## Current Hook Setup

- `.codex/config.toml` enables `features.codex_hooks = true`.
- `.codex/hooks.json` wires lifecycle events to `.codex/scripts/nexus-workflow.mjs`.
- `SessionStart` injects a compact reminder to read current state.
- `PostToolUse` invalidates gates only when the tool payload identifies changed files.
- `PreToolUse` blocks common `git commit` shell invocations if review is missing.
- `Stop` reminds when review, verification, audit, or handover hygiene is missing.

Review, verification, audit, pattern judgment, and model routing stay outside hooks.

The shared deterministic layer is `.codex/scripts/nexus-workflow.mjs`. Hooks should call that layer for trigger/block/remind behavior. They should not become separate workflow engines, because that would split handover, review, audit, routing, and guide logic across too many places.

## Trust And Loading

The repo can provide hook config, but it cannot force every Codex client/session to trust and load that config. That is a security boundary: a repository should not be able to silently make arbitrary local hooks run for every user.

Current Codex behavior checked on 2026-05-09:

- User config lives in `~/.codex/config.toml`.
- Project-scoped overrides can live in `<repo>/.codex/config.toml`.
- Codex loads project-scoped config and project-local hooks only when the project is trusted.
- Hooks need `features.codex_hooks = true`.
- Runtime permission mode such as Full access controls what this session may do; it does not prove future sessions will trust project hooks.

Current mitigation:

- Project config and hooks are checked in.
- `AGENTS.md` tells agents to run workflow scripts at start and before handover.
- `npm run workflow:release-gate` is deterministic and does not depend on hook loading.
- The public/internal guides point humans to the same scripts.

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

- `npm run workflow:status` shows changed/substantive files and gate state.
- `npm run workflow:review-check` checks the current worktree hash.
- `npm run workflow:verify-check` checks verification-relevant changes.
- `npm run workflow:audit-check` checks audit-relevant changes.
- `npm run workflow:handover-check` checks stale handover wording.
- `npm run workflow:release-gate` combines the required checks.

## Hook Design Rule

If a hook starts needing project-specific reasoning, long prompts, source-code review, or deployment logic, move that logic into:

- `.codex/scripts/nexus-workflow.mjs` for deterministic checks,
- `.codex/knowledge/` for durable guidance,
- `.agents/skills/` for reusable agent process,
- `.codex/workflow/records/` for evidence.
