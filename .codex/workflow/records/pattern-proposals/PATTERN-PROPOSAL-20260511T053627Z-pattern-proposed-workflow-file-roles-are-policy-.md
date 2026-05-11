---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260511T053627Z-pattern-proposed-workflow-file-roles-are-policy-"
created: "2026-05-11T05:36:27.767Z"
status: "proposed"
reporter: "codex"
reviewer: ""
evidence: ".codex/workflow/research/workflow-data-shape-audit-2026-05-11.md; .codex/workflow/policy/files.json inventory.roleTaxonomy; .codex/scripts/nexus-workflow.mjs policy/self-test checks"
files: [".codex/workflow/policy/files.json",".codex/workflow/principles.md",".codex/scripts/nexus-workflow.mjs"]
---

# Pattern proposed Workflow file roles are policy-owned, not scattered prose

Status: proposed
Reporter: codex



Summary: Workflow file roles are policy-owned, not scattered prose

Evidence: .codex/workflow/research/workflow-data-shape-audit-2026-05-11.md; .codex/workflow/policy/files.json inventory.roleTaxonomy; .codex/scripts/nexus-workflow.mjs policy/self-test checks

Proposed guidance: When adding workflow files or porting the system, classify each path in policy files inventory.roleTaxonomy and keep generated artifacts/current-state/runtime separated from canonical records and project policy.

Files:
- .codex/workflow/policy/files.json
- .codex/workflow/principles.md
- .codex/scripts/nexus-workflow.mjs

Notes: n/a

Promotion rule: keep this as evidence until review accepts it for durable guidance.
