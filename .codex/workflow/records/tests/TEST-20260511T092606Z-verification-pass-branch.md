---
schema: "nexus-test/v1"
id: "TEST-20260511T092606Z-verification-pass-branch"
created: "2026-05-11T09:26:06.854Z"
scope: "branch"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "23fa459deba165f6"
files: []
patchId: "PATCH-20260511T092428Z-branch-closeout-for-adapter-backed-codex-workflo"
workSliceIds: ["WORK-SLICE-20260511T092322Z-work-slice-done-implement-behavior-preserving-wo"]
commandIds: ["adapter-check-final3-20260511t0918","adapter-sync-dry-run-final3-20260511t0918","policy-check-final3-20260511t0918","inventory-check-final3-20260511t0918","routing-check-final3-20260511t0918","self-test-final3-20260511t0918","model-routing-check-final3-20260511t0918","work-intake-check-final3-20260511t0918","guide-check-branch3-20260511t0926","zoo-visual-guide-check-branch3-20260511t0926","dependency-audit-check-final2-20260511t0910","design-lint-final2-20260511t0910","theme-settings-preview-check-final2-20260511t0910","unit-tests-final2-20260511t0910","build-final2-20260511t0910","prod-zoo-bundle-check-final2-20260511t0910"]
commandEvidence: [{"id":"adapter-check-final3-20260511t0918","command":["npm","run","workflow:adapter-check"],"cwd":".","startedAt":"2026-05-11T09:16:32.939Z","endedAt":"2026-05-11T09:16:33.448Z","durationMs":509,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"adapter-sync-dry-run-final3-20260511t0918","command":["npm","run","workflow:adapter-sync","--","--dry-run"],"cwd":".","startedAt":"2026-05-11T09:16:49.795Z","endedAt":"2026-05-11T09:16:50.228Z","durationMs":432,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"policy-check-final3-20260511t0918","command":["npm","run","workflow:policy-check"],"cwd":".","startedAt":"2026-05-11T09:17:00.179Z","endedAt":"2026-05-11T09:17:00.739Z","durationMs":560,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"inventory-check-final3-20260511t0918","command":["npm","run","workflow:inventory-check"],"cwd":".","startedAt":"2026-05-11T09:17:10.454Z","endedAt":"2026-05-11T09:17:11.054Z","durationMs":600,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"routing-check-final3-20260511t0918","command":["npm","run","workflow:routing-check"],"cwd":".","startedAt":"2026-05-11T09:17:18.983Z","endedAt":"2026-05-11T09:17:19.965Z","durationMs":982,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"self-test-final3-20260511t0918","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-11T09:17:27.222Z","endedAt":"2026-05-11T09:17:37.923Z","durationMs":10701,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"model-routing-check-final3-20260511t0918","command":["npm","run","workflow:model-routing-check"],"cwd":".","startedAt":"2026-05-11T09:17:46.380Z","endedAt":"2026-05-11T09:17:46.817Z","durationMs":437,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"work-intake-check-final3-20260511t0918","command":["npm","run","workflow:work-intake-check"],"cwd":".","startedAt":"2026-05-11T09:17:55.230Z","endedAt":"2026-05-11T09:17:56.734Z","durationMs":1504,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"guide-check-branch3-20260511t0926","command":["npm","run","workflow:guide-check"],"cwd":".","startedAt":"2026-05-11T09:25:42.571Z","endedAt":"2026-05-11T09:25:44.360Z","durationMs":1789,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"zoo-visual-guide-check-branch3-20260511t0926","command":["npm","run","workflow:zoo-visual-guide-check"],"cwd":".","startedAt":"2026-05-11T09:25:52.785Z","endedAt":"2026-05-11T09:25:53.210Z","durationMs":425,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"dependency-audit-check-final2-20260511t0910","command":["npm","run","workflow:dependency-audit-check"],"cwd":".","startedAt":"2026-05-11T09:07:12.958Z","endedAt":"2026-05-11T09:07:14.582Z","durationMs":1624,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"design-lint-final2-20260511t0910","command":["npm","run","lint:design"],"cwd":".","startedAt":"2026-05-11T09:07:23.162Z","endedAt":"2026-05-11T09:07:23.743Z","durationMs":581,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false},{"id":"theme-settings-preview-check-final2-20260511t0910","command":["npm","run","workflow:theme-settings-preview-check"],"cwd":".","startedAt":"2026-05-11T09:07:32.138Z","endedAt":"2026-05-11T09:07:38.286Z","durationMs":6148,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"unit-tests-final2-20260511t0910","command":["npm","test"],"cwd":".","startedAt":"2026-05-11T09:07:47.166Z","endedAt":"2026-05-11T09:08:02.916Z","durationMs":15750,"timeoutMs":360000,"exitCode":0,"timedOut":false,"warned":false},{"id":"build-final2-20260511t0910","command":["npm","run","build"],"cwd":".","startedAt":"2026-05-11T09:08:11.036Z","endedAt":"2026-05-11T09:08:24.449Z","durationMs":13413,"timeoutMs":300000,"exitCode":0,"timedOut":false,"warned":false},{"id":"prod-zoo-bundle-check-final2-20260511t0910","command":["npm","run","workflow:prod-zoo-bundle-check"],"cwd":".","startedAt":"2026-05-11T09:08:36.296Z","endedAt":"2026-05-11T09:08:37.023Z","durationMs":727,"timeoutMs":60000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
artifactEvidence: []
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "479b39e250fb0814"
---

# Verification pass branch

Scope: branch
Verdict: pass
Verifier: codex-lead
Worktree hash: 23fa459deba165f6
Branch evidence hash: 479b39e250fb0814
Work slices: WORK-SLICE-20260511T092322Z-work-slice-done-implement-behavior-preserving-wo
Patch: PATCH-20260511T092428Z-branch-closeout-for-adapter-backed-codex-workflo
Command run ids: adapter-check-final3-20260511t0918, adapter-sync-dry-run-final3-20260511t0918, policy-check-final3-20260511t0918, inventory-check-final3-20260511t0918, routing-check-final3-20260511t0918, self-test-final3-20260511t0918, model-routing-check-final3-20260511t0918, work-intake-check-final3-20260511t0918, guide-check-branch3-20260511t0926, zoo-visual-guide-check-branch3-20260511t0926, dependency-audit-check-final2-20260511t0910, design-lint-final2-20260511t0910, theme-settings-preview-check-final2-20260511t0910, unit-tests-final2-20260511t0910, build-final2-20260511t0910, prod-zoo-bundle-check-final2-20260511t0910

Files: 177 branch file(s). Complete file list is owned by linked patch PATCH-20260511T092428Z-branch-closeout-for-adapter-backed-codex-workflo; this record stores judgment and branch hash only.
Command evidence:
- adapter-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=509, command=npm run workflow:adapter-check
- adapter-sync-dry-run-final3-20260511t0918: exit 0, timedOut=false, durationMs=432, command=npm run workflow:adapter-sync -- --dry-run
- policy-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=560, command=npm run workflow:policy-check
- inventory-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=600, command=npm run workflow:inventory-check
- routing-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=982, command=npm run workflow:routing-check
- self-test-final3-20260511t0918: exit 0, timedOut=false, durationMs=10701, command=npm run workflow:self-test
- model-routing-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=437, command=npm run workflow:model-routing-check
- work-intake-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=1504, command=npm run workflow:work-intake-check
- guide-check-branch3-20260511t0926: exit 0, timedOut=false, durationMs=1789, command=npm run workflow:guide-check
- zoo-visual-guide-check-branch3-20260511t0926: exit 0, timedOut=false, durationMs=425, command=npm run workflow:zoo-visual-guide-check
- dependency-audit-check-final2-20260511t0910: exit 0, timedOut=false, durationMs=1624, command=npm run workflow:dependency-audit-check
- design-lint-final2-20260511t0910: exit 0, timedOut=false, durationMs=581, command=npm run lint:design
- theme-settings-preview-check-final2-20260511t0910: exit 0, timedOut=false, durationMs=6148, command=npm run workflow:theme-settings-preview-check
- unit-tests-final2-20260511t0910: exit 0, timedOut=false, durationMs=15750, command=npm test
- build-final2-20260511t0910: exit 0, timedOut=false, durationMs=13413, command=npm run build
- prod-zoo-bundle-check-final2-20260511t0910: exit 0, timedOut=false, durationMs=727, command=npm run workflow:prod-zoo-bundle-check

Notes: Branch verification passed. Workflow-specific checks were rerun after the routing-cache fix; guide and Zoo/Gym generated views pass after branch review records; unchanged app/design/build/dependency surfaces are covered by final2 command evidence.
