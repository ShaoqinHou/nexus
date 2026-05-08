# Risks

## Open

- Codex project-local hooks load only when the project `.codex/` layer is trusted.
- Hook interception is incomplete; deterministic scripts and lead review discipline remain necessary.
- Full deployment of this branch is still pending.
- Server repo `/root/monoWeb/nexus` had a pre-existing `package-lock.json` modification on 2026-05-09. Deployment must preserve or deliberately resolve that dirty state.
- `ThemeProvider.test.tsx` currently passes but emits a React `act(...)` warning in the live-preview ping-pong regression test.

## Closed

- The initial large dirty-worktree report was caused by using the submodule common git dir, not the linked worktree git dir.
- Spark worker usefulness has positive and negative evidence: narrow Toast warning slice succeeded; broad theme cascade task was refused/escalated.
- Server access and pre-deployment health were validated on 2026-05-09; final deployment remains open.
