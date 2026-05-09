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

## Trust And Loading

The repo can provide hook config, but it cannot force every Codex client/session to trust and load that config. That is a security boundary: a repository should not be able to silently make arbitrary local hooks run for every user.

Current mitigation:

- Project config and hooks are checked in.
- `AGENTS.md` tells agents to run workflow scripts at start and before handover.
- `npm run workflow:release-gate` is deterministic and does not depend on hook loading.
- The public/internal guides point humans to the same scripts.

Operational rule: if hooks do not appear to run, continue with the scripts. Do not treat hooks as the only enforcement mechanism.

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
