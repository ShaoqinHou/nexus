# Workflow Capabilities

This document maps each workflow capability to the files, policy, scripts, records, and gates that make it work. Use it when porting the workflow to another project or auditing whether a feature is genuinely optional.

The important rule: a capability is optional only when the wrapper, policy, guide, scripts, and gates all agree it is optional. Removing a policy file alone is not enough.

## Capability Matrix

| Capability | Status In Nexus | Owned By | Evidence / Gate | Porting Rule |
| --- | --- | --- | --- | --- |
| Core workflow ladder | Required | `AGENTS.md`, `WORKFLOW.md`, `.codex/README.md`, package scripts, `policy/gates.json` | `workflow:status`, `workflow:health`, `workflow:release-gate` | Always copy the ladder shape, then rename project commands and wrapper path. |
| Workflow engine/profile loading | Required | `scripts/workflow-engine.mjs`, `workflow/profile.json`, `policy/manifest.json` | `workflow:policy-check`, `workflow:self-test` | Copy engine first; rewrite profile and manifest before editing wrapper logic. |
| Deterministic project wrapper | Required | `scripts/nexus-workflow.mjs` | all workflow commands | Copy as a starting wrapper, rename it, and remove or adapt Nexus-specific code. Do not assume the wrapper is generic. |
| Work Intake | Required for solo-dev AI work | `policy/intake.json`, `knowledge/work-intake.md`, `templates/intent.md`, `templates/work-slice.md`, records under `intents/` and `work-slices/` | `workflow:work-intake-check`, release gate | Keep unless the target project has another durable intent system. Rewrite intent kinds and guide limits. |
| Patch/review/verify/audit records | Required | `policy/records.json`, record templates, wrapper record commands | `review-check`, `verify-check`, `audit-check`, branch evidence check | Keep. This is the main anti-drift system. |
| Model routing | Recommended when using subagents | `policy/routing.json`, `scenarios/model-routing.json`, `knowledge/model-routing.md`, `.codex/agents/`, `.agents/skills/` | `workflow:model-routing-check`, `workflow:routing-check` | Rewrite scenarios, agent names, and routing criteria for the target project. |
| Hooks | Optional trigger layer | `.codex/config.toml`, `.codex/hooks.json`, `scripts/run-hook.mjs`, `policy/hooks.json` | `hook-config-check`, `hook-runtime-check` | Keep hooks thin. Full access is not enough; use trusted `Custom (config.toml)` when hook runtime matters. Explicit gates remain authoritative. |
| Generated dashboard and public guide | Optional presentation layer, but active in Nexus | `policy/guide.json`, `dashboard/`, guide rendering in wrapper | `workflow:guide-check`, `workflow:guide-browser-finalize`, `workflow:guide-browser-check` | If copied, rewrite guide titles, source files, redaction policy, graph nodes, and public/private split. Generated files must be regenerated, not copied as truth. |
| Deployment validation | Optional, active in Nexus | `policy/deployment.json`, `knowledge/deployment.md`, deployment check scripts, deployment records | `workflow:deployment-check`, `workflow:deployed-gate` | Use only when the target project has a real host. Rewrite URLs, SSH/server knowledge, app/API checks, and deployed guide checks. |
| Design system / Zoo / Gym | Optional in concept, active and currently wrapper-coupled in Nexus | `policy/design.json`, `knowledge/design-system.md`, design scripts, generated Zoo guide, component registry | `workflow:design-zoo`, `workflow:zoo-visual-guide-check`, production Zoo bundle check | Do not just remove `design` from the manifest. The Nexus wrapper currently expects design policy and renders design/Zoo guide sections. For a target project without this capability, either keep a minimal explicit disabled/stub policy and remove guide expectations, or fork/adapt wrapper and guide rendering first. |
| Dependency audit baseline | Optional npm-project hardening | `dependency-audit-baseline.json`, `scripts/audit-deps.mjs`, package scripts | `workflow:dependency-audit-check` | Keep for npm projects only after generating a target-project baseline. Baseline exceptions must be explicit and expiring. |
| CI workflow gates | Optional external enforcement | `.github/workflows/*`, `policy/gates.json` | CI plus `workflow:policy-check` | Copy only for projects using GitHub Actions. Pin command bodies in policy so drift is detected. |

## Capability Boundaries

The current reusable extraction is conservative:

- `workflow-engine.mjs` is the reusable loader/path/sanitizer layer.
- `profile.json` and `policy/*.json` are the first-class data boundary.
- `nexus-workflow.mjs` still contains Nexus wrapper behavior, record lifecycle, guide rendering, Work Intake rendering, and active design/deployment assumptions.

That is intentional for Nexus. For the second project, prove the behavior by adapting the wrapper first. Extract more into `workflow-engine.mjs` only after two projects need the same behavior with different project data.

## Current Nexus Coupling To Watch

These are not release blockers for Nexus, but they matter during porting:

- The wrapper is named `nexus-workflow.mjs`; command examples and package scripts must be renamed deliberately.
- The design/Zoo/Gym capability is active and visible in the guide, policy, scripts, and checks.
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
6. Run policy, inventory, self-test, guide, and release gates.

If those steps are too much for the first port, keep a minimal explicit policy and document the capability as disabled. Do not leave a half-present capability that looks active but cannot pass its gate.
