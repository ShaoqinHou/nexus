---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T065629Z-pattern-accepted-pattern-proposal-records-are-ap"
created: "2026-05-09T06:56:29.299Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: "Bacon audit finding on pattern-proposals missing from EVIDENCE_RECORD_KINDS; .codex/scripts/nexus-workflow.mjs recordIntegrityProblems"
files: [".codex/scripts/nexus-workflow.mjs",".codex/workflow/records/pattern-proposals"]
---

# Pattern accepted pattern proposal records are append-only evidence

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted after audit: dynamic pattern discovery is part of the workflow evidence chain and needs the same correction-record discipline as tests, reviews, audits, and deployments.

Summary: pattern proposal records are append-only evidence

Evidence: Bacon audit finding on pattern-proposals missing from EVIDENCE_RECORD_KINDS; .codex/scripts/nexus-workflow.mjs recordIntegrityProblems

Proposed guidance: Committed pattern proposal records must be corrected by adding a new proposal or decision record, not by editing or deleting historical proposal evidence.

Files:
- .codex/scripts/nexus-workflow.mjs
- .codex/workflow/records/pattern-proposals

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
