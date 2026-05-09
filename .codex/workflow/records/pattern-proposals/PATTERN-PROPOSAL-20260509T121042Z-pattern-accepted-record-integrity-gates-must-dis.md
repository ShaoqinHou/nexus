---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T121042Z-pattern-accepted-record-integrity-gates-must-dis"
created: "2026-05-09T12:10:42.725Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: ".codex/scripts/nexus-workflow.mjs evidenceStatusProblem/gitPathExistsAtHead; workflow:self-test staged-new/staged-modified/committed-modified/staged-deleted record integrity cases"
files: [".codex/scripts/nexus-workflow.mjs"]
---

# Pattern accepted Record integrity gates must distinguish new staged evidence from committed evidence edits

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted after staged post-deployment records showed a false-positive integrity failure.

Summary: Record integrity gates must distinguish new staged evidence from committed evidence edits

Evidence: .codex/scripts/nexus-workflow.mjs evidenceStatusProblem/gitPathExistsAtHead; workflow:self-test staged-new/staged-modified/committed-modified/staged-deleted record integrity cases

Proposed guidance: Append-only evidence enforcement should block edits or removals of records that exist at HEAD or in committed history, but allow newly staged evidence records before commit. Staged add-then-delete evidence records should still fail or be cleaned before commit.

Files:
- .codex/scripts/nexus-workflow.mjs

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
