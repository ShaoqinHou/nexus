---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T081535Z-final-workflow-hardening-commit-scope-after-excl"
created: "2026-05-09T08:15:35.188Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: []
files: [".codex/scripts/nexus-workflow.mjs",".codex/README.md",".codex/knowledge/hooks.md",".codex/knowledge/model-routing.md",".codex/dashboard/index.html",".codex/dashboard/public.html",".codex/workflow/current-state.md","AGENTS.md","package.json"]
verification: "workflow self-test; validate --full; release gate; guide/browser checks"
fallbackTrigger: "Any gate regression or generated-guide stale state"
fallbackTarget: "codex-lead"
deadline: ""
worktreeHash: "224679ad265e8e27"
---

# Final workflow hardening commit scope after excluding generated TypeScript build metadata

Summary: Final workflow hardening commit scope after excluding generated TypeScript build metadata
Route: lead
Worker: codex-lead
Rejected routes: n/a
Write scope: .codex/scripts/nexus-workflow.mjs, .codex/README.md, .codex/knowledge/hooks.md, .codex/knowledge/model-routing.md, .codex/dashboard/index.html, .codex/dashboard/public.html, .codex/workflow/current-state.md, AGENTS.md, package.json
Verification: workflow self-test; validate --full; release gate; guide/browser checks
Fallback trigger: Any gate regression or generated-guide stale state
Fallback target: codex-lead
Deadline: n/a
Worktree hash at routing: 224679ad265e8e27

Notes: n/a
