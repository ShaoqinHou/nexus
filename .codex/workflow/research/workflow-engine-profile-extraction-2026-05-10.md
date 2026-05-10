# Workflow Engine/Profile Extraction

Date: 2026-05-10

## Decision

Nexus now uses a conservative engine/profile split instead of leaving all workflow facts inside `.codex/scripts/nexus-workflow.mjs`.

This is not a many-plugin rewrite. The chosen boundary is:

- reusable system layer: `.codex/scripts/workflow-engine.mjs`;
- Nexus project profile: `.codex/workflow/profile.json`;
- Nexus project policy pack: `.codex/workflow/policy/*.json`;
- stable Nexus command wrapper and kernel surface: `.codex/scripts/nexus-workflow.mjs`.

This route matches the previous audits and the new second-project requirement. A second project can copy the profile/policy shape and keep its project facts out of the engine from the start, while Nexus keeps its proven command names and gates stable.

## What Moved To Policy

- record kinds, schemas, and legacy record allowances;
- required workflow files;
- file classifiers for substantive, verification, audit, guide, and Zoo/Gym visual changes;
- review-kind classifiers for general, workflow, and design review gates;
- public guide source inputs and view contract strings;
- design-system registry, Zoo route, theme token inputs, and visual source inputs;
- hook config and hook command expectations;
- deployment guide URLs;
- lead worker aliases and routing scenario path.

## What Stayed In The Nexus Wrapper

- record writing and parsing mechanics;
- worktree and branch evidence hashing;
- review, verification, audit, deployment, guide, and Zoo/Gym gates;
- generated dashboard/public-guide/Zoo-guide rendering;
- Nexus-specific generated guide prose and graph layout;
- branch closeout, command evidence, and routing lifecycle enforcement.

The wrapper still contains Nexus-specific rendering and domain policy. That is intentional for this pass: extracting data first gives a second project a clear place to replace facts without weakening the working Nexus gates. More code should move into the generic engine only after the second implementation proves the interface.

## Equivalence Checks

Baseline before extraction:

- `extraction-baseline-health`: `workflow:health` passed.
- `extraction-baseline-self-test`: 114 workflow self-tests passed.
- `extraction-baseline-routing`: 15 routing scenarios passed.

After extraction:

- `node .codex/scripts/nexus-workflow.mjs self-test`: 118 workflow self-tests passed.
- `npm run workflow:model-routing-check`: 15 routing scenarios passed.
- `npm run workflow:guide-check`: passed after regenerating guide artifacts.
- `npm run workflow:zoo-visual-guide-check`: passed after regenerating visual guide artifacts.

## Self-Reference Fix

During deployment validation, the workflow exposed a self-referential guide-staleness loop: a deployment record proves the public guide was deployed, but if deployment records are part of the public-guide source hash, recording that proof immediately makes the guide stale.

The fix is policy-level, not a one-off workaround:

- deployment records are excluded from public-guide source-hash inputs in `policy/guide.json`;
- deployment records remain in `guideKinds`, so regenerated dashboards/guides can still display deployment history;
- the self-test asserts both sides of that contract.

## Portability Notes

For the second project, start by replacing policy/profile files, not by editing the engine:

- project identity and generated-surface paths: `workflow/profile.json`;
- file classifications and required files: `policy/files.json`;
- record schemas and legacy exceptions: `policy/records.json`;
- guide sources and public contract: `policy/guide.json`;
- UI/design-system or equivalent validation surface: `policy/design.json`;
- deployment targets: `policy/deployment.json`;
- hooks and trust expectations: `policy/hooks.json`;
- routing scenario paths and lead aliases: `policy/routing.json`.

If the second project needs no visual design Zoo/Gym, replace the design policy and the corresponding generated-guide section with that project's real validation surface instead of carrying Nexus-specific Zoo assumptions forward.
