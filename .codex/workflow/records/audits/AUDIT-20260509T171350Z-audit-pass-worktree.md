---
schema: "nexus-audit/v1"
id: "AUDIT-20260509T171350Z-audit-pass-worktree"
created: "2026-05-09T17:13:50.101Z"
scope: "worktree"
verdict: "pass"
auditor: "codex-lead+agents"
worktreeHash: "515469b118698320"
files: []
commandIds: ["final-audit-closeout-self-test","final-audit-closeout-routing-scenarios"]
commandEvidence: [{"id":"final-audit-closeout-self-test","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-09T17:13:16.766Z","endedAt":"2026-05-09T17:13:19.254Z","durationMs":2488,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-audit-closeout-routing-scenarios","command":["npm","run","workflow:model-routing-check"],"cwd":".","startedAt":"2026-05-09T17:13:25.314Z","endedAt":"2026-05-09T17:13:25.714Z","durationMs":400,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: [".codex/workflow/research/workflow-portability-audit-2026-05-10.md"]
---

# Audit pass worktree

Scope: worktree
Verdict: pass
Auditor: codex-lead+agents
Worktree hash: 515469b118698320

Command run ids: final-audit-closeout-self-test, final-audit-closeout-routing-scenarios
Artifacts: .codex/workflow/research/workflow-portability-audit-2026-05-10.md

Command evidence:
- final-audit-closeout-self-test: exit 0, timedOut=false, durationMs=2488, command=npm run workflow:self-test
- final-audit-closeout-routing-scenarios: exit 0, timedOut=false, durationMs=400, command=npm run workflow:model-routing-check

Notes: High-level workflow audit completed with independent agents. Must-fix findings were addressed at the kernel/source-of-truth level; portability report distinguishes reusable core from Nexus-specific policy. Remaining items are non-blocking future extraction and known risks.
