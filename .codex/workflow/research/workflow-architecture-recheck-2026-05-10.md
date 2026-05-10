# Workflow Architecture Recheck

Date: 2026-05-10

## Trigger

The Codex app warned that project/custom configuration still used deprecated feature keys:

- `features.codex_hooks`, replaced by `features.hooks`
- `features.enable_experimental_windows_sandbox`, replaced by `features.experimental_windows_sandbox`

The user also asked whether the workflow was being fixed by piling patches on top of patches instead of correcting the higher-level architecture.

## Architecture Judgment

The right fix is not only to rename one key in `.codex/config.toml`.

The workflow has a contract stack:

1. `.codex/workflow/policy/*.json` describes project-specific workflow policy.
2. `.codex/scripts/workflow-engine.mjs` owns reusable loading and low-level parsing helpers.
3. `.codex/scripts/nexus-workflow.mjs` owns Nexus-specific gates and commands.
4. `.codex/config.toml`, `.codex/hooks.json`, docs, skills, and generated guides are instances or views of that contract.

For this issue, the architectural source of truth is `.codex/workflow/policy/hooks.json`; the project config should conform to that policy, and `workflow:hook-config-check` should enforce both required current keys and rejected deprecated aliases.

## Fix Applied

- Updated `.codex/config.toml` to use `features.hooks = true`.
- Updated `.codex/workflow/policy/hooks.json` to make `features.hooks` the canonical policy key and list deprecated feature aliases.
- Updated docs/templates that teach future projects to use `features.hooks`.
- Moved section-aware TOML lookup helpers into `.codex/scripts/workflow-engine.mjs` instead of adding more whole-file regex checks to the Nexus kernel.
- Updated `hookConfigProblems()` to read top-level config keys and `[features]` keys through those helpers.
- Added self-tests that reject both deprecated aliases and prove TOML key lookup is section-scoped.
- Updated the user-level `C:\Users\housh\.codex\config.toml` key `enable_experimental_windows_sandbox = true` to `experimental_windows_sandbox = true`.

## Remaining Architecture Boundary

`nexus-workflow.mjs` is still intentionally the single deterministic Nexus workflow kernel. That is better than scattering checks across hooks, docs, and generated views, but the file is large. The next architectural extraction should happen before adding many more independent gate families:

- move reusable config/profile/path validation into `workflow-engine.mjs`,
- keep Nexus-specific policy and record semantics in `nexus-workflow.mjs`,
- keep hooks as thin triggers only,
- avoid introducing new standalone scripts unless they are called by the kernel and represented in policy.

This issue was handled within that direction: policy first, reusable parser helper second, Nexus gate third, docs/views last.

## Evidence

- `npm run workflow:hook-config-check`
- `npm run workflow:policy-check`
- `npm run workflow:inventory-check`
- `npm run workflow:self-test`

