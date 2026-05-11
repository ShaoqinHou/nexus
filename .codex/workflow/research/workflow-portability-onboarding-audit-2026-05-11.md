# Workflow Portability And Onboarding Audit

Date: 2026-05-11

## Reason

After the Codex-native workflow and design-system parity work were deployed, the user pointed out a remaining adoption risk: a second project should not have to infer the workflow's purpose, single-source-of-truth model, copy/rewrite/delete rules, or human learning path from scripts and scattered historical notes.

This audit focused on portability and onboarding rather than functional release readiness.

## Audit Questions

- Is there a canonical high-level document explaining the workflow's design intent?
- Can a human understand what is truth, what is generated, what is mutable telemetry, and what is historical evidence?
- Can a future agent see where project-specific facts belong before copying Nexus files?
- Are optional capabilities, such as design Zoo/Gym or deployment validation, clearly identified?
- Are loose documents and archived Claude-era material classified so they do not become live target-project truth?
- Are there hidden Nexus fallbacks that would silently survive a second-project copy?

## Findings

1. The functional workflow gates were strong, but the portability/onboarding layer was too implicit.
   Evidence: the design intent was spread across `.codex/README.md`, `project-bootstrap.md`, and research notes.

2. Optional workflow capabilities were not clearly mapped.
   Evidence: `project-bootstrap.md` mentioned removing design policy, but the Nexus wrapper still eagerly requires design policy and renders design/Zoo guide sections. This is acceptable for Nexus but risky for a second-project port unless documented.

3. Bootstrap guidance omitted some target-project setup items.
   Evidence: it did not explicitly create fresh `WORKFLOW.md` and `.codex/workflow/current-state.md`, and it did not explicitly copy/adapt `.codex/agents/*.toml` or `.agents/skills/*`.

4. Bootstrap guidance did not explicitly say that `.codex/workflow/research/` and `.codex/archive/` are historical material, not live target-project truth.

5. The hook dispatcher had a hidden fallback to `.codex/scripts/nexus-workflow.mjs` if profile loading failed.
   Evidence: `.codex/scripts/run-hook.mjs` initialized the wrapper path to the Nexus script before attempting profile loading.

6. `PUBLIC_WORKFLOW_URL_ENV` had a Nexus-specific fallback instead of requiring profile-owned configuration.

## Changes Made

- Added `.codex/workflow/principles.md` as the base workflow design, responsibility map, loose-document policy, and migration minimum.
- Added `.codex/workflow/capabilities.md` as the capability matrix for core workflow, Work Intake, routing, hooks, guide/dashboard, deployment, design Zoo/Gym, dependency audit, and CI gates.
- Updated `WORKFLOW.md`, `.codex/README.md`, `AGENTS.md`, `.agents/skills/nexus-workflow/SKILL.md`, `.codex/workflow/templates/README.md`, and `.codex/workflow/templates/project-bootstrap.md` to point humans and agents to the principles/capabilities docs.
- Updated `project-bootstrap.md` to require fresh target-project `WORKFLOW.md`, `.codex/workflow/current-state.md`, agent/skill adaptation, and explicit non-copy rules for Nexus records, current state, dashboard, artifacts, research, archive, runtime, and state cache.
- Updated `policy/files.json` and `policy/guide.json` so the new principles/capabilities docs are required, classified, and included in guide source hashing.
- Removed the hook dispatch fallback to `nexus-workflow.mjs`; hook dispatch now requires `profile.paths.workflowWrapper`.
- Replaced the public workflow URL env fallback with required profile-owned `env.publicWorkflowUrl`.
- Added workflow self-test assertions for the new required docs and the removed Nexus fallbacks.

## Decision On Legacy And Loose Files

No durable evidence records, research reports, generated guide artifacts, or archived Claude-era material were deleted in this pass.

Reason: the inventory gate already classifies those locations, and deleting historical evidence would reduce traceability. The better fix was to add explicit human/agent guidance:

- records are append-only Nexus evidence,
- research reports are historical audit/design notes,
- archive material is historical source evidence,
- generated dashboard/guide files are views,
- runtime/state files are mutable and delete-safe.

Future ports should start fresh rather than copying these as live truth.

## Residual Portability Risk

The Nexus wrapper is still not a fully generic workflow product. It intentionally contains Nexus record lifecycle, guide rendering, Work Intake rendering, and active design/deployment assumptions.

For the second project, copy/adapt the wrapper first and use `.codex/workflow/capabilities.md` to decide which capabilities stay active. Extract more behavior into `workflow-engine.mjs` only after the second project proves the shared boundary.

## Verification Evidence

Fresh command evidence from this pass:

- `portability-onboarding-policy-check-20260511b`
- `portability-onboarding-inventory-check-20260511b`
- `portability-onboarding-self-test-20260511c`
- `portability-onboarding-hook-config-check-20260511`
- `portability-onboarding-work-intake-check-20260511`
- `portability-onboarding-guide-check-after-state-20260511`
- `portability-onboarding-zoo-guide-check-20260511`
- `portability-onboarding-trace-check-20260511`
- `portability-onboarding-handover-check-20260511`

The workflow still needs final patch/review/verify/audit records, guide-browser finalization, branch closeout, and release gate before this cleanup should be copied to another project.
