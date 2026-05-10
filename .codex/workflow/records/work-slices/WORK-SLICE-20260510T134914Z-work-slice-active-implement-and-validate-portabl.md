---
schema: "nexus-work-slice/v1"
id: "WORK-SLICE-20260510T134914Z-work-slice-active-implement-and-validate-portabl"
created: "2026-05-10T13:49:14.702Z"
status: "active"
sourceType: "user-intent"
owner: "codex-lead"
intentIds: ["INTENT-20260510T134902Z-intent-feature-expand-codex-workflow-with-portab"]
summary: "Implement and validate portable Work Intake workflow subsystem"
publicSummary: "Implement and validate portable Work Intake workflow subsystem"
area: "workflow"
priority: ""
acceptance: "Work Intake policy, commands, templates, knowledge, package scripts, gates, dashboard/public guide views, self-tests, failure tests, review/verify/audit records, and final workflow evidence are present and release-gate clean."
verification: "node --check .codex/scripts/nexus-workflow.mjs; npm run workflow:work-intake-check; npm run workflow:self-test; npm run workflow:health; npm run workflow:release-gate; guide browser finalize when guide artifacts are regenerated."
files: [".codex/scripts/nexus-workflow.mjs",".codex/scripts/workflow-engine.mjs",".codex/workflow/policy/",".codex/workflow/templates/",".codex/knowledge/work-intake.md","package.json","AGENTS.md","WORKFLOW.md",".codex/README.md",".agents/skills/"]
externalRefs: []
tags: ["workflow","intake","traceability"]
updatesWorkSliceId: ""
supersedesWorkSliceIds: []
blockedByWorkSliceIds: []
deploymentRequired: false
openedAt: "2026-05-10T13:49:14.701Z"
---

# Work slice active Implement and validate portable Work Intake workflow subsystem

Status: active
Source type: user-intent
Owner: codex-lead
Intent IDs: INTENT-20260510T134902Z-intent-feature-expand-codex-workflow-with-portab
Tags: workflow, intake, traceability
Lead understanding: Implement and validate portable Work Intake workflow subsystem
Acceptance criteria: Work Intake policy, commands, templates, knowledge, package scripts, gates, dashboard/public guide views, self-tests, failure tests, review/verify/audit records, and final workflow evidence are present and release-gate clean.
Non-goals: n/a
Verification plan: node --check .codex/scripts/nexus-workflow.mjs; npm run workflow:work-intake-check; npm run workflow:self-test; npm run workflow:health; npm run workflow:release-gate; guide browser finalize when guide artifacts are regenerated.
Files / scope hints:
- .codex/scripts/nexus-workflow.mjs
- .codex/scripts/workflow-engine.mjs
- .codex/workflow/policy/
- .codex/workflow/templates/
- .codex/knowledge/work-intake.md
- package.json
- AGENTS.md
- WORKFLOW.md
- .codex/README.md
- .agents/skills/
Notes: n/a
