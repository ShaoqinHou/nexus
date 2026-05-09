---
schema: "nexus-test/v1"
id: "TEST-20260509T171341Z-verification-pass-worktree"
created: "2026-05-09T17:13:41.937Z"
scope: "worktree"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "515469b118698320"
files: []
commandIds: ["final-audit-closeout-self-test","final-audit-closeout-routing-scenarios","final-audit-closeout-handover-check"]
commandEvidence: [{"id":"final-audit-closeout-self-test","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-09T17:13:16.766Z","endedAt":"2026-05-09T17:13:19.254Z","durationMs":2488,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-audit-closeout-routing-scenarios","command":["npm","run","workflow:model-routing-check"],"cwd":".","startedAt":"2026-05-09T17:13:25.314Z","endedAt":"2026-05-09T17:13:25.714Z","durationMs":400,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-audit-closeout-handover-check","command":["npm","run","workflow:handover-check"],"cwd":".","startedAt":"2026-05-09T17:13:31.925Z","endedAt":"2026-05-09T17:13:32.324Z","durationMs":399,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
---

# Verification pass worktree

Scope: worktree
Verdict: pass
Verifier: codex-lead
Worktree hash: 515469b118698320

Command run ids: final-audit-closeout-self-test, final-audit-closeout-routing-scenarios, final-audit-closeout-handover-check


Command evidence:
- final-audit-closeout-self-test: exit 0, timedOut=false, durationMs=2488, command=npm run workflow:self-test
- final-audit-closeout-routing-scenarios: exit 0, timedOut=false, durationMs=400, command=npm run workflow:model-routing-check
- final-audit-closeout-handover-check: exit 0, timedOut=false, durationMs=399, command=npm run workflow:handover-check

Notes: Final workflow audit fixes verified: self-test 114/114, model-routing scenarios 15/15 including fabricated Spark failure/escalation paths, and compact handover hygiene passed.
