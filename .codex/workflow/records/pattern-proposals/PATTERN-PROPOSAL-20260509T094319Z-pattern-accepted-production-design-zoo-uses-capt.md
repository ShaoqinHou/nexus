---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T094319Z-pattern-accepted-production-design-zoo-uses-capt"
created: "2026-05-09T09:43:19.576Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: "packages/web/src/routeTree.tsx creates /design routes only inside import.meta.env.DEV; npm run build emitted no Zoo-*.js chunk; .codex/dashboard/zoo/index.html contains 27 captures from packages/web/src/routes/__design/Zoo.tsx"
files: ["packages/web/src/routeTree.tsx",".codex/scripts/capture-design-zoo-visuals.mjs",".codex/scripts/nexus-workflow.mjs",".codex/knowledge/design-system.md"]
---

# Pattern accepted Production design Zoo uses captured visual guide instead of shipping interactive dev route

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted after local build, browser screenshot validation, and guide generation.

Summary: Production design Zoo uses captured visual guide instead of shipping interactive dev route

Evidence: packages/web/src/routeTree.tsx creates /design routes only inside import.meta.env.DEV; npm run build emitted no Zoo-*.js chunk; .codex/dashboard/zoo/index.html contains 27 captures from packages/web/src/routes/__design/Zoo.tsx

Proposed guidance: Keep /design interactive Zoo dev-only. Deploy .codex/dashboard/zoo/ as the production-safe visual Zoo/Gym guide, and verify with workflow:zoo-visual-guide-check plus browser screenshots.

Files:
- packages/web/src/routeTree.tsx
- .codex/scripts/capture-design-zoo-visuals.mjs
- .codex/scripts/nexus-workflow.mjs
- .codex/knowledge/design-system.md

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
