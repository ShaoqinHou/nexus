---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T065619Z-pattern-accepted-generated-workflow-guide-artifa"
created: "2026-05-09T06:56:19.956Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: "Bacon audit finding on .codex/dashboard bypass; .codex/scripts/nexus-workflow.mjs substantiveFiles and guide-check; AGENTS.md/.codex/README.md guidance"
files: [".codex/scripts/nexus-workflow.mjs",".codex/dashboard/index.html",".codex/dashboard/public.html",".codex/README.md"]
---

# Pattern accepted generated workflow guide artifacts are gated user-facing workflow surfaces

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted after audit: generated guide files can affect humans and deployed workflow docs, so they must not bypass the dedicated guide freshness/content-hash and browser validation gates.

Summary: generated workflow guide artifacts are gated user-facing workflow surfaces

Evidence: Bacon audit finding on .codex/dashboard bypass; .codex/scripts/nexus-workflow.mjs substantiveFiles and guide-check; AGENTS.md/.codex/README.md guidance

Proposed guidance: Treat .codex/dashboard/index.html and .codex/dashboard/public.html as generated user-facing workflow surfaces governed by guide freshness/content-hash checks and browser validation; keep their generator, source docs, state files, and workflow rules under normal review/verification/audit gates.

Files:
- .codex/scripts/nexus-workflow.mjs
- .codex/dashboard/index.html
- .codex/dashboard/public.html
- .codex/README.md

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
