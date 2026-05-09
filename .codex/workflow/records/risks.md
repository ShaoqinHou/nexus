# Risks

## Open

- Codex project-local hooks load only when the project `.codex/` layer is trusted. Current mitigation: checked-in `.codex/config.toml`, `.codex/hooks.json`, `AGENTS.md` startup instructions, and deterministic `npm run workflow:*` gates.
- Hook interception is incomplete; examples and fallback instructions are in `.codex/knowledge/hooks.md`. Deterministic scripts and lead review discipline remain necessary.
- Server repo `/root/monoWeb/nexus` had a pre-existing `package-lock.json` modification on 2026-05-09. Deployment must preserve or deliberately resolve that dirty state.
- `ThemeProvider.test.tsx` currently passes but emits a React `act(...)` warning in the live-preview ping-pong regression test.
- Server `npm ci` reported audit findings. They were pre-existing dependency audit findings and were not remediated as part of the workflow migration.

## Closed

- The initial large dirty-worktree report was caused by using the submodule common git dir, not the linked worktree git dir.
- Spark worker usefulness has positive and negative evidence: narrow Toast warning slice succeeded; broad theme cascade task was refused/escalated.
- Server access, deployment, service restart, and hosted health checks were validated on 2026-05-09. Runtime/source deploy was validated at `cf069ce`; later workflow-record commits were fast-forwarded on the server branch.
