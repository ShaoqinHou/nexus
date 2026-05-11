---
schema: "nexus-test/v1"
id: "TEST-20260511T061518Z-verification-pass-worktree"
created: "2026-05-11T06:15:18.738Z"
scope: "worktree"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "d3f3c6f82f1e53ce"
files: [".codex/knowledge/verification.md",".codex/scripts/nexus-workflow.mjs"]
patchId: ""
workSliceIds: ["WORK-SLICE-20260511T060921Z-work-slice-active-audit-workflow-command-telemet"]
commandIds: ["performance-guide-browser-finalize-probe-fixed-20260511","performance-self-test-after-guide-finalize-fix-20260511","performance-guide-check-after-guide-finalize-fix-20260511","performance-guide-browser-check-after-guide-finalize-fix-20260511","performance-trace-check-after-guide-finalize-fix-20260511","performance-policy-check-after-guide-finalize-fix-20260511","performance-zoo-visual-guide-check-after-guide-finalize-fix-20260511"]
commandEvidence: [{"id":"performance-guide-browser-finalize-probe-fixed-20260511","command":["node",".codex/scripts/nexus-workflow.mjs","guide-browser-finalize","--allow-precloseout"],"cwd":".","startedAt":"2026-05-11T06:12:27.273Z","endedAt":"2026-05-11T06:12:39.041Z","durationMs":11768,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-self-test-after-guide-finalize-fix-20260511","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-11T06:13:08.640Z","endedAt":"2026-05-11T06:13:19.943Z","durationMs":11304,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-guide-check-after-guide-finalize-fix-20260511","command":["npm","run","workflow:guide-check"],"cwd":".","startedAt":"2026-05-11T06:13:08.762Z","endedAt":"2026-05-11T06:13:10.828Z","durationMs":2065,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-guide-browser-check-after-guide-finalize-fix-20260511","command":["npm","run","workflow:guide-browser-check"],"cwd":".","startedAt":"2026-05-11T06:13:08.746Z","endedAt":"2026-05-11T06:13:09.488Z","durationMs":741,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-trace-check-after-guide-finalize-fix-20260511","command":["npm","run","workflow:trace-check"],"cwd":".","startedAt":"2026-05-11T06:13:08.550Z","endedAt":"2026-05-11T06:13:09.003Z","durationMs":453,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-policy-check-after-guide-finalize-fix-20260511","command":["npm","run","workflow:policy-check"],"cwd":".","startedAt":"2026-05-11T06:15:04.000Z","endedAt":"2026-05-11T06:15:04.674Z","durationMs":673,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-zoo-visual-guide-check-after-guide-finalize-fix-20260511","command":["npm","run","workflow:zoo-visual-guide-check"],"cwd":".","startedAt":"2026-05-11T06:15:04.088Z","endedAt":"2026-05-11T06:15:04.677Z","durationMs":589,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
artifactEvidence: []
---

# Verification pass worktree

Scope: worktree
Verdict: pass
Verifier: codex-lead
Worktree hash: d3f3c6f82f1e53ce

Work slices: WORK-SLICE-20260511T060921Z-work-slice-active-audit-workflow-command-telemet

Command run ids: performance-guide-browser-finalize-probe-fixed-20260511, performance-self-test-after-guide-finalize-fix-20260511, performance-guide-check-after-guide-finalize-fix-20260511, performance-guide-browser-check-after-guide-finalize-fix-20260511, performance-trace-check-after-guide-finalize-fix-20260511, performance-policy-check-after-guide-finalize-fix-20260511, performance-zoo-visual-guide-check-after-guide-finalize-fix-20260511

Files:
- .codex/knowledge/verification.md
- .codex/scripts/nexus-workflow.mjs
Command evidence:
- performance-guide-browser-finalize-probe-fixed-20260511: exit 0, timedOut=false, durationMs=11768, command=node .codex/scripts/nexus-workflow.mjs guide-browser-finalize --allow-precloseout
- performance-self-test-after-guide-finalize-fix-20260511: exit 0, timedOut=false, durationMs=11304, command=npm run workflow:self-test
- performance-guide-check-after-guide-finalize-fix-20260511: exit 0, timedOut=false, durationMs=2065, command=npm run workflow:guide-check
- performance-guide-browser-check-after-guide-finalize-fix-20260511: exit 0, timedOut=false, durationMs=741, command=npm run workflow:guide-browser-check
- performance-trace-check-after-guide-finalize-fix-20260511: exit 0, timedOut=false, durationMs=453, command=npm run workflow:trace-check
- performance-policy-check-after-guide-finalize-fix-20260511: exit 0, timedOut=false, durationMs=673, command=npm run workflow:policy-check
- performance-zoo-visual-guide-check-after-guide-finalize-fix-20260511: exit 0, timedOut=false, durationMs=589, command=npm run workflow:zoo-visual-guide-check

Notes: Timed finalizer probe passed in 11768ms after one failed Playwright-argument probe; self-test now 275 checks; guide, guide-browser, trace, policy, and Zoo visual guide checks passed.
