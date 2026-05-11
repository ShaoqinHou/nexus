# Workflow Project Layer

This directory holds project-specific workflow inputs that are not portable as
generic system code.

## Current Contents

- `adapters/`: canonical project-specific sources for exact-file adapter outputs.

Adapter targets and source owners are declared in
`.codex/workflow/policy/adapters.json`. The policy separates exact managed files
from managed JSON fields such as `package.json` workflow scripts. Package
workflow scripts are sourced from `.codex/workflow/policy/gates.json`
`gates.packageScripts`, not from this directory.

Use:

```bash
npm run workflow:adapter-check
npm run workflow:adapter-sync
npm run workflow:adapter-uninstall
```

`adapter-check` is the normal gate. `adapter-sync` installs from the source
owner declared in adapter policy to tool-required locations after the sources are
intentionally edited.
`adapter-uninstall` removes only clean managed targets by default and refuses
project-authored root instructions unless forced intentionally.

The active profile, policy pack, knowledge files, records, generated views,
runtime telemetry, and historical research still use their existing paths for
compatibility with the current Nexus wrapper. Their ownership is declared in
`.codex/workflow/policy/files.json` and their portability behavior is declared in
`.codex/workflow/policy/portability.json`.

## Porting Rule

When this workflow is moved to another project, rewrite files in this project
layer before installing adapters. Do not copy Nexus records, generated guides,
runtime state, deployment URLs, design-system facts, or historical briefs as
target-project truth.
