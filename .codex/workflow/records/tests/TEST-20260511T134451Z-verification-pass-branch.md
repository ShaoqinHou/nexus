---
schema: "nexus-test/v1"
id: "TEST-20260511T134451Z-verification-pass-branch"
created: "2026-05-11T13:44:51.702Z"
scope: "branch"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "0a38ba07d53bc2ce"
files: []
patchId: "PATCH-20260511T134416Z-resolve-post-audit-workflow-architecture-gaps"
workSliceIds: ["WORK-SLICE-20260511T130957Z-work-slice-active-fix-guide-capability-gating-an"]
commandIds: ["wf-archfix-policy-20260511","wf-archfix-capability-20260511","wf-archfix-adapter-20260511","wf-archfix-inventory-20260511","wf-archfix-portability-20260511","wf-archfix-self-test-20260511","wf-archfix-trace-20260511","wf-archfix-guide-20260511","wf-archfix-zoo-visual-20260511","wf-archfix-design-lint-20260511","wf-archfix-theme-preview-20260511","wf-archfix-routing-20260511","wf-archfix-dep-audit-20260511","wf-archfix-test-20260511","wf-archfix-build-20260511"]
commandEvidence: [{"id":"wf-archfix-policy-20260511","command":["npm","run","workflow:policy-check"],"cwd":".","startedAt":"2026-05-11T13:42:15.888Z","endedAt":"2026-05-11T13:42:16.719Z","durationMs":831,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-capability-20260511","command":["npm","run","workflow:capability-check"],"cwd":".","startedAt":"2026-05-11T13:42:16.012Z","endedAt":"2026-05-11T13:42:16.656Z","durationMs":644,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-adapter-20260511","command":["npm","run","workflow:adapter-check"],"cwd":".","startedAt":"2026-05-11T13:42:16.033Z","endedAt":"2026-05-11T13:42:16.675Z","durationMs":642,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-inventory-20260511","command":["npm","run","workflow:inventory-check"],"cwd":".","startedAt":"2026-05-11T13:42:15.885Z","endedAt":"2026-05-11T13:42:16.829Z","durationMs":944,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-portability-20260511","command":["npm","run","workflow:portability-check"],"cwd":".","startedAt":"2026-05-11T13:42:28.630Z","endedAt":"2026-05-11T13:42:38.559Z","durationMs":9928,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-self-test-20260511","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-11T13:42:28.625Z","endedAt":"2026-05-11T13:42:42.349Z","durationMs":13724,"timeoutMs":300000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-trace-20260511","command":["npm","run","workflow:trace-check"],"cwd":".","startedAt":"2026-05-11T13:42:16.017Z","endedAt":"2026-05-11T13:42:16.687Z","durationMs":670,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-guide-20260511","command":["npm","run","workflow:guide-check"],"cwd":".","startedAt":"2026-05-11T13:42:28.620Z","endedAt":"2026-05-11T13:42:30.530Z","durationMs":1910,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-zoo-visual-20260511","command":["npm","run","workflow:zoo-visual-guide-check"],"cwd":".","startedAt":"2026-05-11T13:42:28.625Z","endedAt":"2026-05-11T13:42:29.103Z","durationMs":478,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-design-lint-20260511","command":["npm","run","lint:design"],"cwd":".","startedAt":"2026-05-11T13:42:59.841Z","endedAt":"2026-05-11T13:43:00.321Z","durationMs":480,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-theme-preview-20260511","command":["npm","run","workflow:theme-settings-preview-check"],"cwd":".","startedAt":"2026-05-11T13:42:59.859Z","endedAt":"2026-05-11T13:43:04.114Z","durationMs":4254,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-routing-20260511","command":["npm","run","workflow:model-routing-check"],"cwd":".","startedAt":"2026-05-11T13:42:59.840Z","endedAt":"2026-05-11T13:43:00.285Z","durationMs":445,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-dep-audit-20260511","command":["npm","run","workflow:dependency-audit-check"],"cwd":".","startedAt":"2026-05-11T13:42:59.861Z","endedAt":"2026-05-11T13:43:03.015Z","durationMs":3154,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-test-20260511","command":["npm","run","test"],"cwd":".","startedAt":"2026-05-11T13:43:13.212Z","endedAt":"2026-05-11T13:43:27.299Z","durationMs":14086,"timeoutMs":420000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-archfix-build-20260511","command":["npm","run","build"],"cwd":".","startedAt":"2026-05-11T13:43:13.331Z","endedAt":"2026-05-11T13:43:30.942Z","durationMs":17611,"timeoutMs":300000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
artifactEvidence: []
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "ba88a28af22a6d4d"
---

# Verification pass branch

Scope: branch
Verdict: pass
Verifier: codex-lead
Worktree hash: 0a38ba07d53bc2ce
Branch evidence hash: ba88a28af22a6d4d
Work slices: WORK-SLICE-20260511T130957Z-work-slice-active-fix-guide-capability-gating-an
Patch: PATCH-20260511T134416Z-resolve-post-audit-workflow-architecture-gaps
Command run ids: wf-archfix-policy-20260511, wf-archfix-capability-20260511, wf-archfix-adapter-20260511, wf-archfix-inventory-20260511, wf-archfix-portability-20260511, wf-archfix-self-test-20260511, wf-archfix-trace-20260511, wf-archfix-guide-20260511, wf-archfix-zoo-visual-20260511, wf-archfix-design-lint-20260511, wf-archfix-theme-preview-20260511, wf-archfix-routing-20260511, wf-archfix-dep-audit-20260511, wf-archfix-test-20260511, wf-archfix-build-20260511

Files: 229 branch file(s). Complete file list is owned by linked patch PATCH-20260511T134416Z-resolve-post-audit-workflow-architecture-gaps; this record stores judgment and branch hash only.
Command evidence:
- wf-archfix-policy-20260511: exit 0, timedOut=false, durationMs=831, command=npm run workflow:policy-check
- wf-archfix-capability-20260511: exit 0, timedOut=false, durationMs=644, command=npm run workflow:capability-check
- wf-archfix-adapter-20260511: exit 0, timedOut=false, durationMs=642, command=npm run workflow:adapter-check
- wf-archfix-inventory-20260511: exit 0, timedOut=false, durationMs=944, command=npm run workflow:inventory-check
- wf-archfix-portability-20260511: exit 0, timedOut=false, durationMs=9928, command=npm run workflow:portability-check
- wf-archfix-self-test-20260511: exit 0, timedOut=false, durationMs=13724, command=npm run workflow:self-test
- wf-archfix-trace-20260511: exit 0, timedOut=false, durationMs=670, command=npm run workflow:trace-check
- wf-archfix-guide-20260511: exit 0, timedOut=false, durationMs=1910, command=npm run workflow:guide-check
- wf-archfix-zoo-visual-20260511: exit 0, timedOut=false, durationMs=478, command=npm run workflow:zoo-visual-guide-check
- wf-archfix-design-lint-20260511: exit 0, timedOut=false, durationMs=480, command=npm run lint:design
- wf-archfix-theme-preview-20260511: exit 0, timedOut=false, durationMs=4254, command=npm run workflow:theme-settings-preview-check
- wf-archfix-routing-20260511: exit 0, timedOut=false, durationMs=445, command=npm run workflow:model-routing-check
- wf-archfix-dep-audit-20260511: exit 0, timedOut=false, durationMs=3154, command=npm run workflow:dependency-audit-check
- wf-archfix-test-20260511: exit 0, timedOut=false, durationMs=14086, command=npm run test
- wf-archfix-build-20260511: exit 0, timedOut=false, durationMs=17611, command=npm run build

Notes: Branch verification passed after post-audit architecture fixes: policy/capability/adapter/inventory/portability/self-test/trace/guide/Zoo/design/routing/dependency/unit/build checks all passed with timed command evidence.
