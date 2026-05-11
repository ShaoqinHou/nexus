---
schema: "nexus-test/v1"
id: "TEST-20260511T145635Z-verification-pass-branch"
created: "2026-05-11T14:56:35.576Z"
scope: "branch"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "6383d3af44f26f89"
files: []
patchId: "PATCH-20260511T145612Z-finalize-bounded-activity-tracing-and-compact-gu"
workSliceIds: ["WORK-SLICE-20260511T140619Z-work-slice-active-add-policy-owned-activity-trac","WORK-SLICE-20260511T144402Z-work-slice-active-resolve-activity-trace-audit-f","WORK-SLICE-20260511T145314Z-work-slice-active-bound-generated-guide-record-e"]
commandIds: ["verify-activity-check-guide-embed-limits-final","verify-policy-check-guide-embed-limits-final","verify-adapter-check-open-semantics-final","verify-self-test-guide-embed-limits-final","verify-portability-check-guide-embed-limits-final","verify-model-routing-check-open-semantics-final","verify-guide-check-guide-embed-limits-final2","verify-trace-check-open-semantics-final","verify-zoo-visual-guide-check-architecture-final","verify-dependency-audit-check-architecture-final","verify-prod-zoo-bundle-check-architecture-final","verify-design-lint-architecture-final","verify-theme-preview-architecture-final","verify-unit-tests-architecture-final","verify-build-architecture-final","verify-handover-check-guide-embed-limits-final"]
commandEvidence: [{"id":"verify-activity-check-guide-embed-limits-final","command":["npm","run","workflow:activity-check"],"cwd":".","startedAt":"2026-05-11T14:53:42.160Z","endedAt":"2026-05-11T14:53:42.671Z","durationMs":510,"timeoutMs":30000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-policy-check-guide-embed-limits-final","command":["npm","run","workflow:policy-check"],"cwd":".","startedAt":"2026-05-11T14:53:41.173Z","endedAt":"2026-05-11T14:53:41.762Z","durationMs":589,"timeoutMs":30000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-adapter-check-open-semantics-final","command":["npm","run","workflow:adapter-check"],"cwd":".","startedAt":"2026-05-11T14:44:30.986Z","endedAt":"2026-05-11T14:44:31.515Z","durationMs":529,"timeoutMs":30000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-self-test-guide-embed-limits-final","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-11T14:53:43.092Z","endedAt":"2026-05-11T14:53:56.359Z","durationMs":13267,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-portability-check-guide-embed-limits-final","command":["npm","run","workflow:portability-check"],"cwd":".","startedAt":"2026-05-11T14:53:56.741Z","endedAt":"2026-05-11T14:54:06.361Z","durationMs":9620,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-model-routing-check-open-semantics-final","command":["npm","run","workflow:model-routing-check"],"cwd":".","startedAt":"2026-05-11T14:45:32.996Z","endedAt":"2026-05-11T14:45:33.535Z","durationMs":539,"timeoutMs":60000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-guide-check-guide-embed-limits-final2","command":["npm","run","workflow:guide-check"],"cwd":".","startedAt":"2026-05-11T14:54:45.900Z","endedAt":"2026-05-11T14:54:48.446Z","durationMs":2546,"timeoutMs":60000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-trace-check-open-semantics-final","command":["npm","run","workflow:trace-check"],"cwd":".","startedAt":"2026-05-11T14:45:36.315Z","endedAt":"2026-05-11T14:45:36.764Z","durationMs":448,"timeoutMs":30000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-zoo-visual-guide-check-architecture-final","command":["npm","run","workflow:zoo-visual-guide-check"],"cwd":".","startedAt":"2026-05-11T14:34:24.388Z","endedAt":"2026-05-11T14:34:25.067Z","durationMs":679,"timeoutMs":60000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-dependency-audit-check-architecture-final","command":["npm","run","workflow:dependency-audit-check"],"cwd":".","startedAt":"2026-05-11T14:34:26.053Z","endedAt":"2026-05-11T14:34:30.874Z","durationMs":4820,"timeoutMs":60000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-prod-zoo-bundle-check-architecture-final","command":["npm","run","workflow:prod-zoo-bundle-check"],"cwd":".","startedAt":"2026-05-11T14:34:31.410Z","endedAt":"2026-05-11T14:34:32.065Z","durationMs":655,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-design-lint-architecture-final","command":["npm","run","lint:design"],"cwd":".","startedAt":"2026-05-11T14:35:17.617Z","endedAt":"2026-05-11T14:35:18.084Z","durationMs":466,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-theme-preview-architecture-final","command":["npm","run","workflow:theme-settings-preview-check"],"cwd":".","startedAt":"2026-05-11T14:35:18.605Z","endedAt":"2026-05-11T14:35:22.907Z","durationMs":4302,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-unit-tests-architecture-final","command":["npm","test"],"cwd":".","startedAt":"2026-05-11T14:35:23.307Z","endedAt":"2026-05-11T14:35:44.402Z","durationMs":21095,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-build-architecture-final","command":["npm","run","build"],"cwd":".","startedAt":"2026-05-11T14:35:44.810Z","endedAt":"2026-05-11T14:35:57.800Z","durationMs":12991,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"verify-handover-check-guide-embed-limits-final","command":["npm","run","workflow:handover-check"],"cwd":".","startedAt":"2026-05-11T14:55:47.074Z","endedAt":"2026-05-11T14:55:47.509Z","durationMs":435,"timeoutMs":30000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
artifactEvidence: []
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "bbf1b6bf26692d32"
---

# Verification pass branch

Scope: branch
Verdict: pass
Verifier: codex-lead
Worktree hash: 6383d3af44f26f89
Branch evidence hash: bbf1b6bf26692d32
Work slices: WORK-SLICE-20260511T140619Z-work-slice-active-add-policy-owned-activity-trac, WORK-SLICE-20260511T144402Z-work-slice-active-resolve-activity-trace-audit-f, WORK-SLICE-20260511T145314Z-work-slice-active-bound-generated-guide-record-e
Patch: PATCH-20260511T145612Z-finalize-bounded-activity-tracing-and-compact-gu
Command run ids: verify-activity-check-guide-embed-limits-final, verify-policy-check-guide-embed-limits-final, verify-adapter-check-open-semantics-final, verify-self-test-guide-embed-limits-final, verify-portability-check-guide-embed-limits-final, verify-model-routing-check-open-semantics-final, verify-guide-check-guide-embed-limits-final2, verify-trace-check-open-semantics-final, verify-zoo-visual-guide-check-architecture-final, verify-dependency-audit-check-architecture-final, verify-prod-zoo-bundle-check-architecture-final, verify-design-lint-architecture-final, verify-theme-preview-architecture-final, verify-unit-tests-architecture-final, verify-build-architecture-final, verify-handover-check-guide-embed-limits-final

Files: 231 branch file(s). Complete file list is owned by linked patch PATCH-20260511T145612Z-finalize-bounded-activity-tracing-and-compact-gu; this record stores judgment and branch hash only.
Command evidence:
- verify-activity-check-guide-embed-limits-final: exit 0, timedOut=false, durationMs=510, command=npm run workflow:activity-check
- verify-policy-check-guide-embed-limits-final: exit 0, timedOut=false, durationMs=589, command=npm run workflow:policy-check
- verify-adapter-check-open-semantics-final: exit 0, timedOut=false, durationMs=529, command=npm run workflow:adapter-check
- verify-self-test-guide-embed-limits-final: exit 0, timedOut=false, durationMs=13267, command=npm run workflow:self-test
- verify-portability-check-guide-embed-limits-final: exit 0, timedOut=false, durationMs=9620, command=npm run workflow:portability-check
- verify-model-routing-check-open-semantics-final: exit 0, timedOut=false, durationMs=539, command=npm run workflow:model-routing-check
- verify-guide-check-guide-embed-limits-final2: exit 0, timedOut=false, durationMs=2546, command=npm run workflow:guide-check
- verify-trace-check-open-semantics-final: exit 0, timedOut=false, durationMs=448, command=npm run workflow:trace-check
- verify-zoo-visual-guide-check-architecture-final: exit 0, timedOut=false, durationMs=679, command=npm run workflow:zoo-visual-guide-check
- verify-dependency-audit-check-architecture-final: exit 0, timedOut=false, durationMs=4820, command=npm run workflow:dependency-audit-check
- verify-prod-zoo-bundle-check-architecture-final: exit 0, timedOut=false, durationMs=655, command=npm run workflow:prod-zoo-bundle-check
- verify-design-lint-architecture-final: exit 0, timedOut=false, durationMs=466, command=npm run lint:design
- verify-theme-preview-architecture-final: exit 0, timedOut=false, durationMs=4302, command=npm run workflow:theme-settings-preview-check
- verify-unit-tests-architecture-final: exit 0, timedOut=false, durationMs=21095, command=npm test
- verify-build-architecture-final: exit 0, timedOut=false, durationMs=12991, command=npm run build
- verify-handover-check-guide-embed-limits-final: exit 0, timedOut=false, durationMs=435, command=npm run workflow:handover-check

Notes: Final branch verification: activity-check/policy-check passed after guide compaction; self-test 311/0; portability fixture passed; guide-check passed after dashboard shrink to 309501 bytes and public guide 233813 bytes; model-routing 18/0, trace, Zoo visual, dependency audit, production Zoo bundle, design lint, theme preview, unit tests, build, and handover-check passed.
