---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T100929Z-visual-zoo-guide-thin-hook-config-dependency-aud"
created: "2026-05-09T10:09:29.530Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: ["spark","nexus_spark_worker"]
files: [".codex/scripts/nexus-workflow.mjs",".codex/scripts/audit-deps.mjs",".codex/scripts/capture-design-zoo-visuals.mjs",".codex/scripts/check-production-zoo-bundle.mjs",".codex/scripts/run-hook.mjs",".codex/hooks.json",".codex/config.toml",".github/workflows/nexus-workflow-gates.yml","package.json","packages/web/src/routeTree.tsx"]
verification: "workflow:self-test, audit:deps, workflow:hook-config-check, workflow:prod-zoo-bundle-check, workflow:guide-check, workflow:zoo-visual-guide-check, repo Playwright browser rendering"
fallbackTrigger: ""
fallbackTarget: ""
deadline: ""
worktreeHash: "b71e0d90f0f1b1a6"
---

# Visual Zoo guide, thin-hook config, dependency-audit baseline, CI, and production Zoo bundle hardening

Summary: Visual Zoo guide, thin-hook config, dependency-audit baseline, CI, and production Zoo bundle hardening
Route: lead
Worker: codex-lead
Rejected routes: spark, nexus_spark_worker
Write scope: .codex/scripts/nexus-workflow.mjs, .codex/scripts/audit-deps.mjs, .codex/scripts/capture-design-zoo-visuals.mjs, .codex/scripts/check-production-zoo-bundle.mjs, .codex/scripts/run-hook.mjs, .codex/hooks.json, .codex/config.toml, .github/workflows/nexus-workflow-gates.yml, package.json, packages/web/src/routeTree.tsx
Verification: workflow:self-test, audit:deps, workflow:hook-config-check, workflow:prod-zoo-bundle-check, workflow:guide-check, workflow:zoo-visual-guide-check, repo Playwright browser rendering
Fallback trigger: n/a
Fallback target: n/a
Deadline: n/a
Worktree hash at routing: b71e0d90f0f1b1a6

Notes: Lead retained this slice because it spans workflow architecture, hook loading policy, security/audit baseline, CI gates, production bundle behavior, and visual guide validation. Spark was rejected because the task is cross-cutting and includes enforcement design plus deployment-facing guide changes.
