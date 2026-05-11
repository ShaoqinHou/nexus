# Workflow Capabilities

This document maps each workflow capability to the files, policy, scripts, records, and gates that make it work. Use it when porting the workflow to another project or auditing whether a feature is genuinely optional.

The important rule: a capability is optional only when the wrapper, policy, guide, scripts, and gates all agree it is optional. Removing a policy file alone is not enough.

## Capability Matrix

| Capability | Status In Nexus | Owned By | Evidence / Gate | Porting Rule |
| --- | --- | --- | --- | --- |
| Core workflow ladder | Required | `AGENTS.md`, `WORKFLOW.md`, `.codex/README.md`, package scripts, `policy/gates.json` | `workflow:status`, `workflow:health`, `workflow:release-gate` | Always copy the ladder shape, then rename project commands and wrapper path. |
| Workflow engine/profile loading | Required | `workflow/system/scripts/workflow-engine.mjs`, `workflow/profile.json`, `policy/manifest.json` | `workflow:policy-check`, `workflow:self-test` | Copy system engine first; rewrite profile and manifest before editing project wrapper logic. |
| Deterministic workflow kernel | Required | `workflow/system/scripts/workflow-kernel.mjs` plus project wrapper shim | all workflow commands, `workflow:capability-check` | Copy the system kernel as reusable code. Rename only the project wrapper and command surfaces. |
| Empty-project portability role-play | Required for workflow migration | `workflow/system/fixtures/portable-empty/`, `workflow/system/scripts/workflow-kernel.mjs`, `policy/portability.json` | `workflow:portability-check`, release gate | Keep. This proves the system layer can run from an inspectable fresh-project fixture with disabled/stubbed optional capabilities before project content exists. |
| Deterministic project wrapper | Required | `scripts/nexus-workflow.mjs`, sourced from `workflow/project/adapters/scripts/nexus-workflow.mjs` | all workflow commands, `workflow:adapter-check` | Rewrite/rename the wrapper shim for the target project; do not copy Nexus command names as target truth. |
| Fixed-path adapters | Required | `policy/adapters.json`, exact-file sources in `workflow/project/adapters/*`, package script source map in `policy/gates.json` `gates.packageScripts`, and fixed outputs such as `AGENTS.md`, `WORKFLOW.md`, `.codex/config.toml`, `.codex/hooks.json`, `.codex/scripts/run-hook.mjs`, `.codex/agents`, `.agents/skills`, `.github/workflows`, and package workflow scripts | `workflow:adapter-check`, release gate, `workflow:self-test` | Rewrite the source owner declared in `policy/adapters.json` first, then sync/check installed outputs. Do not copy Nexus adapter sources as target truth. |
| Work Intake | Required for solo-dev AI work | `policy/intake.json`, `knowledge/work-intake.md`, `templates/intent.md`, `templates/work-slice.md`, records under `intents/` and `work-slices/` | `workflow:work-intake-check`, release gate | Keep unless the target project has another durable intent system. Rewrite intent kinds and guide limits. |
| Patch/review/verify/audit records | Required | `policy/records.json`, record templates, wrapper record commands | `review-check`, `verify-check`, `audit-check`, branch evidence check | Keep. This is the main anti-drift system. |
| Historical compatibility | Required while old records exist | `policy/compatibility.json` | `workflow:policy-check`, record integrity checks | Keep project history out of the live records contract. Rewrite or remove when the target project starts fresh. |
| Model routing | Recommended when using subagents | `policy/routing.json`, `scenarios/model-routing.json`, `knowledge/model-routing.md`, `.codex/agents/`, `.agents/skills/` | `workflow:model-routing-check`, `workflow:routing-check` | Rewrite scenarios, agent names, and routing criteria for the target project. |
| Hooks | Optional trigger layer | `.codex/config.toml`, `.codex/hooks.json`, `.codex/scripts/run-hook.mjs`, `workflow/system/scripts/run-hook.mjs`, `policy/hooks.json` | `hook-config-check`, `hook-runtime-check` | Keep hooks thin. Full access is not enough; use trusted `Custom (config.toml)` when hook runtime matters. Explicit gates remain authoritative. |
| Generated dashboard and public guide | Optional presentation layer, but active in Nexus | `policy/guide.json`, `dashboard/`, guide rendering in system kernel | `workflow:guide-check`, `workflow:guide-browser-finalize`, `workflow:guide-browser-check` | If active, rewrite guide titles, source files, redaction policy, graph nodes, and public/private split. Generated files must be regenerated, not copied as truth. |
| Deployment validation | Optional, active in Nexus | `policy/deployment.json`, `knowledge/deployment.md`, deployment check scripts, deployment records | `workflow:deployment-check`, `workflow:deployed-gate` | Use only when the target project has a real host. Rewrite URLs, SSH/server knowledge, app/API checks, and deployed guide checks. |
| Design system / Zoo / Gym | Optional in concept, active and currently wrapper-coupled in Nexus | `policy/design.json`, `knowledge/design-system.md`, design scripts, generated Zoo guide, component registry | `workflow:design-zoo`, `workflow:zoo-visual-guide-check`, production Zoo bundle check | Do not just remove `design` from the manifest. The Nexus wrapper currently expects design policy and renders design/Zoo guide sections. For a target project without this capability, either keep a minimal explicit disabled/stub policy and remove guide expectations, or fork/adapt wrapper and guide rendering first. |
| Dependency audit baseline | Optional npm-project hardening | `dependency-audit-baseline.json`, `scripts/audit-deps.mjs`, package scripts | `workflow:dependency-audit-check` | Keep for npm projects only after generating a target-project baseline. Baseline exceptions must be explicit and expiring. |
| CI workflow gates | Optional external enforcement | `.github/workflows/*`, `policy/gates.json` | CI plus `workflow:policy-check` | Copy only for projects using GitHub Actions. Pin command bodies in policy so drift is detected. |

## Capability Boundaries

The reusable extraction now uses a system/project split:

- `workflow/system/scripts/workflow-engine.mjs` is the reusable loader/path/sanitizer layer.
- `workflow/system/scripts/workflow-kernel.mjs` is the reusable deterministic kernel.
- `workflow/system/scripts/run-hook.mjs` is the reusable hook-dispatcher implementation.
- `workflow/system/fixtures/portable-empty/` is the inspectable empty-project fixture used by `workflow:portability-check`.
- `.codex/scripts/nexus-workflow.mjs` is a project wrapper shim, sourced from `workflow/project/adapters/scripts/nexus-workflow.mjs`.
- `.codex/scripts/workflow-engine.mjs` is a compatibility shim for fixed-path imports.
- `.codex/scripts/run-hook.mjs` is a fixed-path shim sourced from `workflow/project/adapters/scripts/run-hook.mjs`.
- `profile.json` and `policy/*.json` are the first-class data boundary.
- `policy/portability.json` owns capability state: required, active optional, disabled stub, or unsupported.
- `policy/adapters.json` is the first-class fixed-file boundary; it maps exact-file targets to `workflow/project/adapters/` and package workflow scripts to `policy/gates.json` `gates.packageScripts`.
- `workflow:portability-check` builds a temporary empty project using the reusable system layer plus fresh project data stubs. It should pass before claiming the workflow can be moved by path/context alone.

Design-system/Zoo/Gym and deployment validation are still active in Nexus, but they are capability-gated in the kernel. A new or empty project should disable or stub those capabilities until real project data exists.

## Current Nexus Coupling To Watch

These are not release blockers for Nexus, but they matter during porting:

- The wrapper shim is named `nexus-workflow.mjs`; command examples and package scripts must be renamed deliberately.
- Adapter source files are Nexus-specific even when their installed paths are generic.
- The design/Zoo/Gym capability is active and visible in the guide, policy, scripts, and checks. It is not required for an empty target project.
- Deployment checks target `https://cv.rehou.games/nexus/` and must be replaced.
- Skills and agents are named `nexus-*`.
- Design-system knowledge is Nexus-specific and must not become generic guidance.
- Historical records and research explain this migration but are not target-project state.

## Disable Or Replace A Capability

When a target project does not need a capability:

1. Remove or replace its package scripts.
2. Remove or replace its policy file and manifest entry only after the wrapper no longer eagerly requires it.
3. Remove guide sections and guide contract strings tied to that capability.
4. Remove required-file and classifier entries for its scripts/knowledge.
5. Update self-tests so the absence is intentional and checked.
6. Run policy, inventory, portability, self-test, guide, and release gates.

If those steps are too much for the first port, keep a minimal explicit policy and document the capability as disabled. Do not leave a half-present capability that looks active but cannot pass its gate.
