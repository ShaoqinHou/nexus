---
name: nexus-verify
description: Verify Nexus changes with local tests, browser checks, E2E behavior, deployment checks, and evidence records. Use for user-facing changes, design-system work, API changes, release readiness, server validation, or when a workflow requires proof beyond unit tests.
---

# Nexus Verify

## Local Gates

Choose the smallest sufficient set, then broaden when risk is cross-cutting:

```bash
npm run lint:design
npm run test --workspace=packages/api
npm run test --workspace=packages/web
npm test
npm run build
```

Production subpath build:

```bash
cd packages/web
MSYS_NO_PATHCONV=1 npx vite build --base /nexus/
```

## Browser Verification

For visible or interactive changes:

- start API and web dev servers,
- open `http://localhost:5173`,
- verify visual state, interactions, expected network calls, console errors, and output correctness,
- test tenant-specific behavior when relevant.

## Server Verification

Use `.codex/knowledge/deployment.md`.

Confirm:

- server repo has the intended update,
- static files are deployed to the `/nexus/` path,
- `nexus-api` is healthy,
- public HTML and API/smoke checks pass.

## Record Evidence

After meaningful validation:

```bash
node .codex/scripts/nexus-workflow.mjs record-verify --scope worktree --verdict pass --verifier <name> --notes "<commands and results>"
node .codex/scripts/nexus-workflow.mjs record-test --summary "<gate>" --notes "<commands and results>"
node .codex/scripts/nexus-workflow.mjs record-deployment --summary "<deploy>" --notes "<server evidence>"
```

`record-verify` is the gate record. `record-test` and `record-deployment` are supporting evidence.
