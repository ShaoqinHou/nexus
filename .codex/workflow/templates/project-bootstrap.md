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
2. Copy the reusable loader and the thin hook dispatcher:
   - `.codex/scripts/workflow-engine.mjs`
   - `.codex/scripts/run-hook.mjs`
3. Copy the Nexus wrapper as a starting implementation, then rename it for the target project:
   - source: `.codex/scripts/nexus-workflow.mjs`
   - target example: `.codex/scripts/<project>-workflow.mjs`
   - set `.codex/workflow/profile.json` `paths.workflowWrapper` to the renamed wrapper path so `run-hook.mjs`, templates, hooks, and docs do not hardcode the Nexus filename.
   - replace Nexus identity, guide labels, design-system modules, deployment URLs, environment variable names, and project-specific docs through profile/policy first.
4. Add package scripts equivalent to the workflow ladder and helper commands. At minimum:
   - `workflow:status`
   - `workflow:health`
   - `workflow:release-gate`
   - `workflow:deployed-gate` when hosted validation exists
   - `workflow:run`
   - `workflow:self-test`
   - `workflow:policy-check`
   - `workflow:inventory-check`
   - `workflow:trace-check`
5. Copy/adapt `.github/workflows/nexus-workflow-gates.yml` if the project uses GitHub CI. The policy pack should pin the exact package-script command bodies and CI run commands so drift is detected.
6. Create a project-local `.codex/config.toml`, `.codex/hooks.json`, `.codex/README.md`, `.codex/workflow/profile.json`, `.codex/workflow/policy/manifest.json`, and the manifest-listed `.codex/workflow/policy/*.json`.
7. Keep workflow mechanics in scripts and policy, not in bulky hook bodies.
8. Add a work-intake policy and knowledge file if the project will be driven by user prompts, vague feature ideas, or solo-dev AI sessions:
   - `.codex/workflow/policy/intake.json` defines record kinds, statuses, stale-slice limits, external tracker policy, and guide presentation limits.
   - `.codex/knowledge/work-intake.md` explains how to capture compact user intent, lead-interpreted work slices, evidence links, and external tracker references.
   - `.codex/workflow/templates/intent.md` and `.codex/workflow/templates/work-slice.md` define the durable record shapes.
9. If the target project has no design Zoo/Gym yet, make that an explicit policy capability decision instead of leaving dead Nexus checks in place:
   - remove `design` from the policy manifest and disable design/Zoo scripts in the wrapper, or
   - keep a minimal design policy with empty/disabled visual checks and document what will enable them later.
10. Put project-specific facts in the target project's profile, policy, and knowledge files.
11. Run the target project's equivalents of:

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
- inventory/policy/trace checks,
- hook dispatch boundaries,
- release/deployment gate structure.
- reusable record/intake architecture shape to copy and adapt.

Current extraction boundary:

- `.codex/scripts/workflow-engine.mjs` is reusable loading/matching infrastructure.
- `.codex/workflow/policy/manifest.json` is the policy membership source of truth.
- The reusable engine has a small core policy fallback only for bootstrap safety. Project domains such as design-system and deployment must be listed in the target project's policy manifest before scripts depend on them.
- Nexus record commands, Work Intake lifecycle checks, and guide rendering currently live in `.codex/scripts/nexus-workflow.mjs`.
- For the second project, copy/adapt the wrapper shape first, then decide which mechanics deserve extraction into a shared engine after behavior matches in both projects.

Project-specific policy:

- project identity and URLs,
- required files,
- file classifiers,
- design-system source files,
- model-routing scenarios,
- deployment conventions,
- project patterns and invariants.
- project-specific intent kinds, feature labels, external tracker prefixes, and guide presentation limits.

When porting, copy the shape first, then replace project-specific facts before claiming the workflow works.
