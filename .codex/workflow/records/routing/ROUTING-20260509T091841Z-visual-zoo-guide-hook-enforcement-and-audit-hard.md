---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T091841Z-visual-zoo-guide-hook-enforcement-and-audit-hard"
created: "2026-05-09T09:18:41.075Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: ["spark","strong"]
files: []
verification: "npm run workflow:zoo-visual-guide-check; npm run workflow:self-test; npm run workflow:release-gate; npm test; npm run build; npm audit; browser/server checks"
fallbackTrigger: "If dependency upgrades break broad API/Web behavior or visual surface needs architectural redesign"
fallbackTarget: "nexus_strong_worker"
deadline: ""
worktreeHash: "90f16ea23e8b568a"
---

# visual-zoo-guide-hook-enforcement-and-audit-hardening

Summary: visual-zoo-guide-hook-enforcement-and-audit-hardening
Route: lead
Worker: codex-lead
Rejected routes: spark, strong
Write scope: n/a
Verification: npm run workflow:zoo-visual-guide-check; npm run workflow:self-test; npm run workflow:release-gate; npm test; npm run build; npm audit; browser/server checks
Fallback trigger: If dependency upgrades break broad API/Web behavior or visual surface needs architectural redesign
Fallback target: nexus_strong_worker
Deadline: n/a
Worktree hash at routing: 90f16ea23e8b568a

Notes: Lead-owned cross-cutting workflow/dashboard/dependency/deployment change; Spark is intentionally rejected because this touches deterministic workflow gates, generated docs, dependency lockfile, and server validation.
