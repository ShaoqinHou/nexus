# Risks

## Open

- Codex project-local hooks load only when the project `.codex/` layer is trusted. Current mitigation: checked-in `.codex/config.toml`, `.codex/hooks.json`, `AGENTS.md` startup instructions, and deterministic `npm run workflow:*` gates.
- Hook interception is incomplete; examples and fallback instructions are in `.codex/knowledge/hooks.md`. Deterministic scripts and lead review discipline remain necessary.
- Server repo `/root/monoWeb/nexus` had a pre-existing `package-lock.json` modification on 2026-05-09. Deployment must preserve or deliberately resolve that dirty state.
- Dependency audit was rechecked on 2026-05-10 and still passes through `npm run audit:deps`, with four moderate dev-only Drizzle CLI advisories temporarily baselined until 2026-06-09. Latest `drizzle-kit` is still 0.31.10 and still depends on vulnerable `@esbuild-kit/esm-loader`/`esbuild`. Recheck by the baseline expiry, and remove `.codex/workflow/dependency-audit-baseline.json` entries when upstream fixes. Evidence: `TEST-20260510T073945Z-dependency-audit-baseline-recheck`.
- Design-system reference `v1` and archived Claude notes contain some stale guidance. Current mitigation: `.codex/knowledge/design-system.md` reconciles stale Zoo-route, tenant accent override, 6-theme residue, and semantic-token claims with current production code, and remaining parity gaps are tracked there.

## Closed

- The initial large dirty-worktree report was caused by using the submodule common git dir, not the linked worktree git dir.
- Spark worker usefulness has positive and negative evidence: narrow Toast warning slice succeeded; broad theme cascade task was refused/escalated.
- Server access, deployment, service restart, and hosted health checks were validated on 2026-05-09. Runtime/source deploy was validated at `cf069ce`; later workflow-record commits were fast-forwarded on the server branch.
- Direct dependency audit findings for `@anthropic-ai/sdk`, `drizzle-orm`, `hono`, and `postcss` were remediated on 2026-05-09; the remaining audit surface is explicit, dev-only, and expiring.
- The non-failing React `act(...)` warning in `ThemeProvider.test.tsx` was removed by using Testing Library `fireEvent.click`. Evidence: `themeprovider-warning-repro-20260510T1449Z` reproduced the warning, `themeprovider-warning-fixed-20260510T1451Z` passed without the warning, and `local-test-all-20260510T1452Z` passed the full API/web suite.
