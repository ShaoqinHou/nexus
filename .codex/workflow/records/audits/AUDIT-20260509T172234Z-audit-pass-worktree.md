---
schema: "nexus-audit/v1"
id: "AUDIT-20260509T172234Z-audit-pass-worktree"
created: "2026-05-09T17:22:34.538Z"
scope: "worktree"
verdict: "pass"
auditor: "codex-lead"
worktreeHash: "e12ced03ac5e9733"
files: []
commandIds: ["final-public-guide-check-self-test","local-public-guide-deployed-image-check"]
commandEvidence: [{"id":"final-public-guide-check-self-test","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-09T17:21:33.296Z","endedAt":"2026-05-09T17:21:35.720Z","durationMs":2424,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"local-public-guide-deployed-image-check","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-09T17:21:50.745Z","endedAt":"2026-05-09T17:21:59.477Z","durationMs":8731,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
---

# Audit pass worktree

Scope: worktree
Verdict: pass
Auditor: codex-lead
Worktree hash: e12ced03ac5e9733

Command run ids: final-public-guide-check-self-test, local-public-guide-deployed-image-check


Command evidence:
- final-public-guide-check-self-test: exit 0, timedOut=false, durationMs=2424, command=npm run workflow:self-test
- local-public-guide-deployed-image-check: exit 0, timedOut=false, durationMs=8731, command=npm run workflow:public-guide-deployed-check

Notes: Audit passed: the design-review deployment gap is addressed by a checked-in script, not a one-off inline command, and validation evidence confirms current public Zoo images load.
