---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T123041Z-final-deployment-evidence-screenshot-policy-guid"
created: "2026-05-09T12:30:41.927Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: []
files: [".agents/skills/nexus-verify/SKILL.md",".codex/README.md",".codex/knowledge/verification.md",".codex/scripts/nexus-workflow.mjs",".codex/workflow/templates/guide-browser.md",".codex/workflow/current-state.md",".codex/dashboard",".codex/workflow/artifacts/screenshots/guide-browser-final",".codex/workflow/artifacts/screenshots/server-final",".codex/workflow/records","package.json"]
verification: "workflow:self-test, workflow:records-check before and after staging, workflow:guide-browser-finalize, workflow:guide-browser-check, workflow:commit-gate, workflow:release-gate, server URL and browser checks"
fallbackTrigger: "Any stale hash, staging-state hash drift, missing summary evidence, missing dashboard coverage, staged-new-record false positive, stale guide, stale browser record, or release-gate failure"
fallbackTarget: "codex-lead"
deadline: ""
worktreeHash: "807507612dd6074b"
---

# final deployment evidence, screenshot policy, guide finalizer, staged-record gate fix, and content hash stabilization

Summary: final deployment evidence, screenshot policy, guide finalizer, staged-record gate fix, and content hash stabilization
Route: lead
Worker: codex-lead
Rejected routes: n/a
Write scope: .agents/skills/nexus-verify/SKILL.md, .codex/README.md, .codex/knowledge/verification.md, .codex/scripts/nexus-workflow.mjs, .codex/workflow/templates/guide-browser.md, .codex/workflow/current-state.md, .codex/dashboard, .codex/workflow/artifacts/screenshots/guide-browser-final, .codex/workflow/artifacts/screenshots/server-final, .codex/workflow/records, package.json
Verification: workflow:self-test, workflow:records-check before and after staging, workflow:guide-browser-finalize, workflow:guide-browser-check, workflow:commit-gate, workflow:release-gate, server URL and browser checks
Fallback trigger: Any stale hash, staging-state hash drift, missing summary evidence, missing dashboard coverage, staged-new-record false positive, stale guide, stale browser record, or release-gate failure
Fallback target: codex-lead
Deadline: n/a
Worktree hash at routing: 807507612dd6074b

Notes: n/a
