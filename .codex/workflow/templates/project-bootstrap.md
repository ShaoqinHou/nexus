# Project Bootstrap Template

Use this when adapting this Codex workflow to another project or checking that a new Nexus session is loaded correctly.

Read `.codex/workflow/principles.md`, `.codex/workflow/capabilities.md`, `.codex/workflow/system/README.md`, and `.codex/workflow/project/README.md` first. Those files explain what is reusable, what is project-specific, what is generated, what is durable evidence, which capabilities are optional, and what must not be copied as live truth.

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

1. Read `.codex/workflow/principles.md`, `.codex/workflow/capabilities.md`, this template, and the target project's `AGENTS.md`.
2. Copy the reusable loader and the thin hook dispatcher:
   - `.codex/scripts/workflow-engine.mjs`
   - `.codex/scripts/run-hook.mjs`
3. Copy the Nexus wrapper as a starting implementation, then rename it for the target project:
   - source: `.codex/scripts/nexus-workflow.mjs`
   - target example: `.codex/scripts/<project>-workflow.mjs`
   - set `.codex/workflow/profile.json` `paths.workflowWrapper` to the renamed wrapper path so `run-hook.mjs`, templates, hooks, and docs do not hardcode the Nexus filename.
   - replace Nexus identity, guide labels, design-system modules, deployment URLs, environment variable names, and project-specific docs through profile/policy first.
4. Create target-project adapter source owners and wire them through `.codex/workflow/policy/adapters.json` before installing fixed-path outputs. Treat `.codex/workflow/project/adapters/` as the canonical source for exact-file outputs:
   - `AGENTS.md`
   - `WORKFLOW.md`
   - `.codex/config.toml`
   - `.codex/hooks.json`
   - `.codex/agents/*.toml`
   - `.agents/skills/*`
   - `.github/workflows/*`
   Treat `.codex/workflow/policy/gates.json` `gates.packageScripts` as the canonical source for managed package workflow scripts.
5. Add package scripts equivalent to the workflow ladder and helper commands. At minimum:
   - `workflow:status`
   - `workflow:health`
   - `workflow:release-gate`
   - `workflow:deployed-gate` when hosted validation exists
   - `workflow:run`
   - `workflow:self-test`
   - `workflow:adapter-check`
   - `workflow:adapter-sync`
   - `workflow:adapter-uninstall`
   - `workflow:policy-check`
   - `workflow:inventory-check`
   - `workflow:trace-check`
6. Copy/adapt project agents and repo skills if the target project will use subagents or specialized review/verify/audit behavior:
   - `.codex/agents/*.toml`
   - `.agents/skills/*/SKILL.md`
   - `.agents/skills/*/agents/openai.yaml`
   - rename `nexus-*` roles, command names, worker names, model routes, and project facts in the adapter sources before syncing installed files.
7. Copy/adapt `.github/workflows/nexus-workflow-gates.yml` if the project uses GitHub CI. The policy pack should pin the exact package-script command bodies and CI run commands so drift is detected.
8. Create and maintain fixed-path files through canonical adapter source owners, not one-off installed edits:
   - root instructions: `.codex/workflow/project/adapters/root/AGENTS.md` and `root/WORKFLOW.md`
   - Codex config/hooks: `.codex/workflow/project/adapters/codex/config.toml` and `codex/hooks.json`
   - Codex agents: `.codex/workflow/project/adapters/codex/agents/*.toml`
   - repo skills: `.codex/workflow/project/adapters/repo-skills/skills/*/SKILL.md` and `agents/openai.yaml`
   - CI gates: `.codex/workflow/project/adapters/github/workflows/*.yml`
   - package workflow scripts: `.codex/workflow/policy/gates.json` `gates.packageScripts`
   Then run `workflow:adapter-sync` to install them and `workflow:adapter-check` to prove they still match. Create non-adapter canonical files directly: `.codex/README.md`, `.codex/workflow/principles.md`, `.codex/workflow/capabilities.md`, `.codex/workflow/current-state.md`, `.codex/workflow/profile.json`, `.codex/workflow/policy/manifest.json`, and the manifest-listed `.codex/workflow/policy/*.json`. Create `current-state.md` from `.codex/workflow/templates/current-state.md`, not from Nexus live state.
9. Keep workflow mechanics in scripts and policy, not in bulky hook bodies.
10. Add a work-intake policy and knowledge file if the project will be driven by user prompts, vague feature ideas, or solo-dev AI sessions:
   - `.codex/workflow/policy/intake.json` defines record kinds, statuses, stale-slice limits, external tracker policy, and guide presentation limits.
   - `.codex/knowledge/work-intake.md` explains how to capture compact user intent, lead-interpreted work slices, evidence links, and external tracker references.
   - `.codex/workflow/templates/intent.md` and `.codex/workflow/templates/work-slice.md` define the durable record shapes.
11. Use `.codex/workflow/capabilities.md` to decide which capabilities are active. If the target project has no design Zoo/Gym yet, make that an explicit capability decision instead of leaving dead Nexus checks in place:
   - remove `design` from the policy manifest and disable design/Zoo scripts in the wrapper, or
   - keep a minimal design policy with empty/disabled visual checks and document what will enable them later.
12. Put project-specific facts in the target project's profile, policy, knowledge files, and adapter sources.
13. Start fresh target-project records. Do not copy Nexus `.codex/workflow/records/`, `.codex/workflow/current-state.md`, `.codex/dashboard/`, `.codex/workflow/artifacts/`, `.codex/workflow/research/`, `.codex/archive/`, runtime telemetry, or state cache as live truth. Copy selected research/archive files only into an explicitly historical reference folder if they help explain the migration.
14. Run `adapter-sync` only after adapter sources are rewritten, then run the target project's equivalents of:

```bash
npm run workflow:adapter-sync -- --dry-run
npm run workflow:adapter-check
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
- adapter check/sync/uninstall contract for fixed-path integration.

Current extraction boundary:

- `.codex/scripts/workflow-engine.mjs` is reusable loading/matching infrastructure.
- `.codex/workflow/policy/manifest.json` is the policy membership source of truth.
- `.codex/workflow/policy/adapters.json` is the fixed-path integration boundary. It maps exact-file targets to `.codex/workflow/project/adapters/` and package workflow scripts to `.codex/workflow/policy/gates.json` `gates.packageScripts`.
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
- project-specific adapter source owners for fixed instructions, skills, agents, hooks/config, CI, and package workflow scripts.

When porting, copy the shape first, then replace project-specific facts before claiming the workflow works.

## Human Orientation Rule

The target project should have a short root entry point like `WORKFLOW.md`, a detailed `.codex/README.md`, a principles/map document like `.codex/workflow/principles.md`, and a capability matrix like `.codex/workflow/capabilities.md`.

If a human cannot answer "what is truth, what is generated, what do I copy, what do I rewrite, and where do project facts live" without reading scripts, the port is not ready.
