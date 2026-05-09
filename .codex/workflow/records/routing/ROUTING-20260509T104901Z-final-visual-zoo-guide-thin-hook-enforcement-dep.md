---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T104901Z-final-visual-zoo-guide-thin-hook-enforcement-dep"
created: "2026-05-09T10:49:01.802Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: []
files: [".codex/scripts/nexus-workflow.mjs",".codex/scripts/capture-design-zoo-visuals.mjs",".codex/scripts/audit-deps.mjs",".codex/scripts/check-production-zoo-bundle.mjs",".codex/scripts/run-hook.mjs",".codex/hooks.json",".codex/config.toml",".codex/dashboard",".codex/workflow/dependency-audit-baseline.json","packages/web/src/routeTree.tsx","package.json","package-lock.json","packages/api/package.json",".github/workflows/nexus-workflow-gates.yml"]
verification: "workflow guide checks, visual zoo screenshot/browser evidence, model-routing check, records/routing/review/verify/audit gates, dependency audit, hook-config check, prod zoo bundle check, tests/build before commit and server release gate after deploy"
fallbackTrigger: "If deterministic gates fail, reviewers find gaps, browser images are broken, production bundle ships dev Zoo, dependency baseline drifts, or deployment validation fails"
fallbackTarget: "nexus_strong_worker"
deadline: ""
worktreeHash: "50a1fc86c292616e"
---

# final visual zoo guide, thin hook enforcement, dependency audit, and deterministic evidence hardening

Summary: final visual zoo guide, thin hook enforcement, dependency audit, and deterministic evidence hardening
Route: lead
Worker: codex-lead
Rejected routes: n/a
Write scope: .codex/scripts/nexus-workflow.mjs, .codex/scripts/capture-design-zoo-visuals.mjs, .codex/scripts/audit-deps.mjs, .codex/scripts/check-production-zoo-bundle.mjs, .codex/scripts/run-hook.mjs, .codex/hooks.json, .codex/config.toml, .codex/dashboard, .codex/workflow/dependency-audit-baseline.json, packages/web/src/routeTree.tsx, package.json, package-lock.json, packages/api/package.json, .github/workflows/nexus-workflow-gates.yml
Verification: workflow guide checks, visual zoo screenshot/browser evidence, model-routing check, records/routing/review/verify/audit gates, dependency audit, hook-config check, prod zoo bundle check, tests/build before commit and server release gate after deploy
Fallback trigger: If deterministic gates fail, reviewers find gaps, browser images are broken, production bundle ships dev Zoo, dependency baseline drifts, or deployment validation fails
Fallback target: nexus_strong_worker
Deadline: n/a
Worktree hash at routing: 50a1fc86c292616e

Notes: n/a
