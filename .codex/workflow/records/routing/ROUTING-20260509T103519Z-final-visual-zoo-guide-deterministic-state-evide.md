---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T103519Z-final-visual-zoo-guide-deterministic-state-evide"
created: "2026-05-09T10:35:19.706Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: ["spark","nexus_spark_worker"]
files: [".codex/scripts/nexus-workflow.mjs",".codex/scripts/audit-deps.mjs",".codex/scripts/capture-design-zoo-visuals.mjs",".codex/scripts/check-production-zoo-bundle.mjs",".codex/scripts/run-hook.mjs",".codex/hooks.json",".codex/config.toml",".github/workflows/nexus-workflow-gates.yml","package.json","packages/api/package.json","package-lock.json","packages/web/src/routeTree.tsx",".codex/dashboard/zoo"]
verification: "lint:design, api tests, web tests, build, design-zoo, capture-zoo-visuals, zoo-visual-guide-check, guide-browser-check, audit:deps, hook-config-check, prod-zoo-bundle-check, self-test, records-check"
fallbackTrigger: ""
fallbackTarget: ""
deadline: ""
worktreeHash: "ab37388df8244e29"
---

# Final visual Zoo guide, deterministic state-evidence gates, hook matcher enforcement, dependency audit hardening, CI, and production Zoo bundle guard

Summary: Final visual Zoo guide, deterministic state-evidence gates, hook matcher enforcement, dependency audit hardening, CI, and production Zoo bundle guard
Route: lead
Worker: codex-lead
Rejected routes: spark, nexus_spark_worker
Write scope: .codex/scripts/nexus-workflow.mjs, .codex/scripts/audit-deps.mjs, .codex/scripts/capture-design-zoo-visuals.mjs, .codex/scripts/check-production-zoo-bundle.mjs, .codex/scripts/run-hook.mjs, .codex/hooks.json, .codex/config.toml, .github/workflows/nexus-workflow-gates.yml, package.json, packages/api/package.json, package-lock.json, packages/web/src/routeTree.tsx, .codex/dashboard/zoo
Verification: lint:design, api tests, web tests, build, design-zoo, capture-zoo-visuals, zoo-visual-guide-check, guide-browser-check, audit:deps, hook-config-check, prod-zoo-bundle-check, self-test, records-check
Fallback trigger: n/a
Fallback target: n/a
Deadline: n/a
Worktree hash at routing: ab37388df8244e29

Notes: Lead retained this slice because it is cross-cutting workflow infrastructure: durable evidence semantics, hook/config policy, dependency security baseline, CI gates, production bundle behavior, deployment-facing visual guide, and browser validation. Spark was rejected because this needs architecture and enforcement judgment, not a narrow coding slice.
