# Project Bootstrap Template

Use this when adapting this Codex workflow to another project or checking that a new Nexus session is loaded correctly.

## Per-Project Config

Each project should have its own `.codex/config.toml`. It is project-local because trust, hooks, agent limits, sandbox posture, and workflow policy belong to the repository being worked on.

For Nexus, the intended Codex UI mode is `Custom (config.toml)` after the project is trusted. The checked-in config sets:

```toml
sandbox_mode = "danger-full-access"
approval_policy = "never"

[features]
hooks = true
multi_agent = true
```

That keeps the same no-prompt posture as `Full access` while also letting Codex load project hooks and agent settings.

`Full access` alone is not a hook-loading guarantee. It controls permissions for the current session. The repository cannot force future Codex clients to trust and load project hooks; that is a client security boundary.

## Bootstrap Prompt For Another Project

Ask the lead agent to:

1. Read this template and the target project's `AGENTS.md`.
2. Create a project-local `.codex/config.toml`, `.codex/hooks.json`, `.codex/README.md`, `.codex/workflow/profile.json`, and `.codex/workflow/policy/*.json`.
3. Keep workflow mechanics in scripts and policy, not in bulky hook bodies.
4. Put project-specific facts in the target project's profile, policy, and knowledge files.
5. Run the target project's equivalents of:

```bash
npm run workflow:policy-check
npm run workflow:inventory-check
npm run workflow:trace-check
npm run workflow:self-test
npm run workflow:release-gate
```

If project hooks are expected, also run:

```bash
npm run workflow:hook-config-check
npm run workflow:hook-runtime-check
```

Treat `hook-runtime-check` as a local-session diagnostic. A missing heartbeat means the lead should use `Custom (config.toml)` in a trusted project, then start a fresh session and check again. It should not weaken release gates.

## Separation Rule

Reusable system:

- workflow engine loading,
- path policy,
- record schemas,
- inventory/policy/trace checks,
- hook dispatch boundaries,
- release/deployment gate structure.

Project-specific policy:

- project identity and URLs,
- required files,
- file classifiers,
- design-system source files,
- model-routing scenarios,
- deployment conventions,
- project patterns and invariants.

When porting, copy the shape first, then replace project-specific facts before claiming the workflow works.
