# Current State Template

Use this template for `.codex/workflow/current-state.md`. Keep it compact and stable.

## Stable Sections

- Original request link.
- First required factual answers.
- Active goal.
- Current phase.
- Implemented workflow/product pieces.
- Representative records and evidence.
- Server/deployment status by record link, not self-staling final commit text.
- Important git/environment notes.
- Next required work.

## Rules

- Do not paste long transcripts.
- Do not list "commit/push/pull this current-state update" as next work; finish those steps before handover.
- Do not hardcode a "final workflow-record commit" that the handover commit itself can make stale. Refer to branch HEAD or the deployment record.
- Do not label old record IDs as "current hash" unless the hash is generated live by `npm run workflow:status`.
- Keep volatile details in records under `.codex/workflow/records/` and link to them.
- Run `npm run workflow:release-gate` before final handover. Use `npm run workflow:handover-check` only to diagnose a release-gate handover failure.
