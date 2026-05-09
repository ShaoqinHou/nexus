---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T094531Z-visual-zoo-guide-hook-enforcement-dependency-aud"
created: "2026-05-09T09:45:31.878Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: ["spark"]
files: []
verification: "npm run lint:design; npm run test --workspace=packages/api; npm run test --workspace=packages/web; npm run build; npm run workflow:design-zoo; npm run workflow:zoo-visual-guide-check; npm run workflow:hook-config-check; npm run workflow:dependency-audit-check; browser-rendered screenshots; no production Zoo chunk"
fallbackTrigger: "If focused review finds architecture, deployment, or dependency-compatibility issues beyond local repair"
fallbackTarget: "nexus_strong_worker"
deadline: ""
worktreeHash: "5e0e4c3494a0fa46"
---

# visual-zoo-guide-hook-enforcement-dependency-audit-and-dev-route-hardening

Summary: visual-zoo-guide-hook-enforcement-dependency-audit-and-dev-route-hardening
Route: lead
Worker: codex-lead
Rejected routes: spark
Write scope: n/a
Verification: npm run lint:design; npm run test --workspace=packages/api; npm run test --workspace=packages/web; npm run build; npm run workflow:design-zoo; npm run workflow:zoo-visual-guide-check; npm run workflow:hook-config-check; npm run workflow:dependency-audit-check; browser-rendered screenshots; no production Zoo chunk
Fallback trigger: If focused review finds architecture, deployment, or dependency-compatibility issues beyond local repair
Fallback target: nexus_strong_worker
Deadline: n/a
Worktree hash at routing: 5e0e4c3494a0fa46

Notes: Lead-owned because the patch spans workflow kernel, generated guide, CI, dependency policy, route-tree production behavior, and server deployment.
