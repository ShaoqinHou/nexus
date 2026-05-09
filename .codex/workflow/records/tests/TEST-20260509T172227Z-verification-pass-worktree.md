---
schema: "nexus-test/v1"
id: "TEST-20260509T172227Z-verification-pass-worktree"
created: "2026-05-09T17:22:27.011Z"
scope: "worktree"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "e12ced03ac5e9733"
files: []
commandIds: ["final-public-guide-check-script-node-check","final-public-guide-check-kernel-node-check","final-public-guide-check-self-test","final-public-guide-check-routing","local-public-guide-deployed-image-check"]
commandEvidence: [{"id":"final-public-guide-check-script-node-check","command":["node","--check",".codex/scripts/check-public-guide-images.mjs"],"cwd":".","startedAt":"2026-05-09T17:21:20.415Z","endedAt":"2026-05-09T17:21:20.463Z","durationMs":48,"timeoutMs":30000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-public-guide-check-kernel-node-check","command":["node","--check",".codex/scripts/nexus-workflow.mjs"],"cwd":".","startedAt":"2026-05-09T17:21:26.917Z","endedAt":"2026-05-09T17:21:26.965Z","durationMs":48,"timeoutMs":30000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-public-guide-check-self-test","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-09T17:21:33.296Z","endedAt":"2026-05-09T17:21:35.720Z","durationMs":2424,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-public-guide-check-routing","command":["npm","run","workflow:model-routing-check"],"cwd":".","startedAt":"2026-05-09T17:21:42.301Z","endedAt":"2026-05-09T17:21:42.701Z","durationMs":400,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false},{"id":"local-public-guide-deployed-image-check","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-09T17:21:50.745Z","endedAt":"2026-05-09T17:21:59.477Z","durationMs":8731,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
---

# Verification pass worktree

Scope: worktree
Verdict: pass
Verifier: codex-lead
Worktree hash: e12ced03ac5e9733

Command run ids: final-public-guide-check-script-node-check, final-public-guide-check-kernel-node-check, final-public-guide-check-self-test, final-public-guide-check-routing, local-public-guide-deployed-image-check


Command evidence:
- final-public-guide-check-script-node-check: exit 0, timedOut=false, durationMs=48, command=node --check .codex/scripts/check-public-guide-images.mjs
- final-public-guide-check-kernel-node-check: exit 0, timedOut=false, durationMs=48, command=node --check .codex/scripts/nexus-workflow.mjs
- final-public-guide-check-self-test: exit 0, timedOut=false, durationMs=2424, command=npm run workflow:self-test
- final-public-guide-check-routing: exit 0, timedOut=false, durationMs=400, command=npm run workflow:model-routing-check
- local-public-guide-deployed-image-check: exit 0, timedOut=false, durationMs=8731, command=npm run workflow:public-guide-deployed-check

Notes: Public guide image-load check addition verified: new script syntax ok, kernel syntax ok, self-test 114/114, model-routing 15/15, and public guide/Zoo check loaded 54 images.
