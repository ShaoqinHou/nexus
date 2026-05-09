---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T120521Z-pattern-accepted-screenshot-evidence-must-be-mac"
created: "2026-05-09T12:05:21.552Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: ".codex/knowledge/verification.md; .codex/workflow/templates/guide-browser.md; final guide artifact and server screenshot summaries include titles, image counts, and broken image counts"
files: [".codex/knowledge/verification.md",".codex/workflow/templates/guide-browser.md",".agents/skills/nexus-verify/SKILL.md"]
---

# Pattern accepted Screenshot evidence must be machine-checkable proof plus bounded human previews

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted after re-evaluating screenshot evidence from first principles during final workflow validation.

Summary: Screenshot evidence must be machine-checkable proof plus bounded human previews

Evidence: .codex/knowledge/verification.md; .codex/workflow/templates/guide-browser.md; final guide artifact and server screenshot summaries include titles, image counts, and broken image counts

Proposed guidance: Use deterministic summaries and workflow records for pass/fail; use JPEG only for broad human-readable page previews; use PNG/lossless artifacts for pixel-sensitive visual regression, exact colors, and debugging; avoid committing full-page screenshots unless full-page layout is the claim.

Files:
- .codex/knowledge/verification.md
- .codex/workflow/templates/guide-browser.md
- .agents/skills/nexus-verify/SKILL.md

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
