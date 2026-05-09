---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T094331Z-pattern-accepted-dependency-audit-exceptions-mus"
created: "2026-05-09T09:43:31.379Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: "npm audit direct high/runtime findings were remediated; npm run audit:deps passes only because .codex/workflow/dependency-audit-baseline.json lists remaining dev-only drizzle-kit advisories with expiry 2026-06-09"
files: [".codex/scripts/audit-deps.mjs",".codex/workflow/dependency-audit-baseline.json","package.json",".github/workflows/nexus-workflow-gates.yml"]
---

# Pattern accepted Dependency audit exceptions must be explicit expiring workflow records

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted because latest drizzle-kit still carries the dev-only transitive advisory and npm's suggested fix is an unsafe downgrade.

Summary: Dependency audit exceptions must be explicit expiring workflow records

Evidence: npm audit direct high/runtime findings were remediated; npm run audit:deps passes only because .codex/workflow/dependency-audit-baseline.json lists remaining dev-only drizzle-kit advisories with expiry 2026-06-09

Proposed guidance: Do not ignore npm audit output or hide it in hooks. Use audit:deps and an expiring baseline for unavoidable dev-only advisories; high and critical advisories fail release gates.

Files:
- .codex/scripts/audit-deps.mjs
- .codex/workflow/dependency-audit-baseline.json
- package.json
- .github/workflows/nexus-workflow-gates.yml

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
