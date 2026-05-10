---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260510T191819Z-pattern-proposed-workflow-helper-scripts-that-fe"
created: "2026-05-10T19:18:19.967Z"
status: "proposed"
reporter: "codex"
reviewer: ""
evidence: "Fourth duplicate-agent audit found hardcoded defaults in check-production-app, validate-design-zoo, capture-design-zoo-visuals, and public-guide checks; fixed in final14 policy/self-test/design-zoo/capture evidence."
files: [".codex/scripts/workflow-engine.mjs",".codex/scripts/check-production-app.mjs",".codex/scripts/validate-design-zoo.mjs",".codex/scripts/capture-design-zoo-visuals.mjs",".codex/scripts/check-public-guide-images.mjs",".codex/workflow/policy"]
---

# Pattern proposed Workflow helper scripts that feed gates must fail closed from profile and policy

Status: proposed
Reporter: codex



Summary: Workflow helper scripts that feed gates must fail closed from profile and policy

Evidence: Fourth duplicate-agent audit found hardcoded defaults in check-production-app, validate-design-zoo, capture-design-zoo-visuals, and public-guide checks; fixed in final14 policy/self-test/design-zoo/capture evidence.

Proposed guidance: Gate and proof helper scripts must require profile/policy values through the workflow engine. Do not add hidden Nexus/localhost/theme/path fallbacks in helper scripts that create or validate release evidence.

Files:
- .codex/scripts/workflow-engine.mjs
- .codex/scripts/check-production-app.mjs
- .codex/scripts/validate-design-zoo.mjs
- .codex/scripts/capture-design-zoo-visuals.mjs
- .codex/scripts/check-public-guide-images.mjs
- .codex/workflow/policy

Notes: n/a

Promotion rule: keep this as evidence until review accepts it for durable guidance.
