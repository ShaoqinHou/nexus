# Workflow System Layer

This directory is the reusable side of the Codex workflow.

The current implementation is conservative: the main Nexus wrapper still lives at
`.codex/scripts/nexus-workflow.mjs`, and this directory owns the shared structure
around fixed-path adapters. Future extraction should move reusable code here only
after the same behavior is proven in at least two projects.

## Adapter Contract

Fixed-path files are required by tools:

- `AGENTS.md`
- `WORKFLOW.md`
- `.codex/config.toml`
- `.codex/hooks.json`
- `.codex/agents/*.toml`
- `.agents/skills/*`
- `.github/workflows/*`
- `package.json` workflow scripts

Their canonical source owners are declared in
`.codex/workflow/policy/adapters.json`. Exact-file adapter sources live in
`.codex/workflow/project/adapters/`; package workflow scripts are sourced from
`.codex/workflow/policy/gates.json` `gates.packageScripts` and installed into
`package.json` by the package-scripts adapter.

Use:

```bash
npm run workflow:adapter-check
npm run workflow:adapter-sync
npm run workflow:adapter-uninstall
```

`adapter-check` is part of the release gate. `adapter-sync` refuses to overwrite
drifted targets unless `--force` is passed through the workflow command.
`adapter-uninstall` removes only clean managed targets and managed package
script fields.

## Boundary

This layer does not make generated files the source of truth. Durable truth
remains append-only records plus git/worktree state. Project facts remain in
profile, policy, knowledge, and project adapter sources.
