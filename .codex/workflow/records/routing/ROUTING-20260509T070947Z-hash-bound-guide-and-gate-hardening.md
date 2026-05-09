---
schema: "nexus-routing/v1"
id: "ROUTING-20260509T070947Z-hash-bound-guide-and-gate-hardening"
created: "2026-05-09T07:09:47.512Z"
route: "lead"
worker: "codex-lead"
rejectedRoutes: []
files: [".codex/scripts/nexus-workflow.mjs",".codex/README.md",".agents/skills/nexus-verify/SKILL.md",".codex/workflow/current-state.md",".codex/workflow/templates/guide-browser.md","package.json"]
verification: "node --check .codex/scripts/nexus-workflow.mjs; records-check; routing-check; guide-check; guide-browser-check after screenshots; zoo-check; model-routing-check; self-test; focused review; release gate"
fallbackTrigger: ""
fallbackTarget: ""
deadline: ""
worktreeHash: "adc4b7d447900352"
---

# Hash-bound guide and gate hardening

Summary: Hash-bound guide and gate hardening
Route: lead
Worker: codex-lead
Rejected routes: n/a
Write scope: .codex/scripts/nexus-workflow.mjs, .codex/README.md, .agents/skills/nexus-verify/SKILL.md, .codex/workflow/current-state.md, .codex/workflow/templates/guide-browser.md, package.json
Verification: node --check .codex/scripts/nexus-workflow.mjs; records-check; routing-check; guide-check; guide-browser-check after screenshots; zoo-check; model-routing-check; self-test; focused review; release gate
Fallback trigger: n/a
Fallback target: n/a
Deadline: n/a
Worktree hash at routing: adc4b7d447900352

Notes: Final lead-owned slice adds hash-bound routing, record/state guide freshness inputs, guide browser gate, OS-temp self-test fixtures, and docs/templates.
