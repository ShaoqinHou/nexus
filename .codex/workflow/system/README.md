# Workflow System Layer

This directory is the reusable side of the Codex workflow. It contains the shared
deterministic kernel and loader code that should move to another project without
carrying project-specific facts.

## System Code

- `scripts/workflow-kernel.mjs`: shared CLI implementation for records, gates,
  adapter checks, capability checks, guide generation, hooks, and Work Intake.
- `scripts/workflow-engine.mjs`: shared profile/policy/path/TOML helpers.
- `scripts/run-hook.mjs`: shared thin dispatcher for Codex hook events. It reads
  the project wrapper path from the active profile.
- `fixtures/portable-empty/`: inspectable empty-project bootstrap fixture used by
  `workflow:portability-check`. The kernel copies this fixture, injects the
  current system scripts, and runs the gate ladder against it.

The fixed files under `.codex/scripts/` are compatibility entry points:

- the project wrapper path declared by `workflow/profile.json` `paths.workflowWrapper`
  imports the system kernel.
- `.codex/scripts/workflow-engine.mjs` re-exports the system engine for helper
  scripts that still import the fixed path.
- `.codex/scripts/run-hook.mjs` imports the system hook dispatcher so hooks have
  a fixed command path while the implementation remains portable.

Project facts must still live outside this layer, in profile, policy, knowledge,
records, project adapter sources, and optional capability inputs.

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

Exact-file sources are payloads for the installed target path. This matters for
script shims: an adapter source under `workflow/project/adapters/scripts/` may
import `../workflow/system/...` because the synced target lives under
`.codex/scripts/`. Validate payloads with `adapter-check` after sync instead of
executing the source location directly.

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

## Capability Boundary

The kernel contains reusable mechanics and optional capability hooks. A target
project turns capabilities on or off through `.codex/workflow/policy/portability.json`
and the policy manifest. A project with deployment or Design Zoo/Gym support can
activate those capabilities; an empty project can keep them disabled until real
URLs, routes, registry files, and checks exist.

Design-related defaults fail closed when the design capability is active. If a
project enables Design Zoo/Gym, policy must provide its URLs, routes, registry,
theme matrix, and capture settings instead of inheriting localhost or route
fallbacks from system code.

This layer does not make generated files the source of truth. Durable truth
remains append-only records plus git/worktree state. Project facts remain in
profile, policy, knowledge, and project adapter sources.
