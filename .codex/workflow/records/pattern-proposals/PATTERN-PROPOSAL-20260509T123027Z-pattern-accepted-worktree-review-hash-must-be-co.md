---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T123027Z-pattern-accepted-worktree-review-hash-must-be-co"
created: "2026-05-09T12:30:27.722Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: ".codex/scripts/nexus-workflow.mjs worktreeHashFromContent/worktreeContentEntries; workflow:self-test worktree hash content-change and staging-state checks; commit-gate failure after git add exposed the issue"
files: [".codex/scripts/nexus-workflow.mjs"]
---

# Pattern accepted Worktree review hash must be content-based, not staging-state-based

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted after staging invalidated otherwise valid review/verify/audit records.

Summary: Worktree review hash must be content-based, not staging-state-based

Evidence: .codex/scripts/nexus-workflow.mjs worktreeHashFromContent/worktreeContentEntries; workflow:self-test worktree hash content-change and staging-state checks; commit-gate failure after git add exposed the issue

Proposed guidance: Review, verification, audit, patch, and routing hashes must not change when the same file contents move from unstaged to staged. Hash current substantive file content, and use separate gates for committed evidence integrity.

Files:
- .codex/scripts/nexus-workflow.mjs

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
