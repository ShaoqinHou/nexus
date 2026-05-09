---
schema: "nexus-audit/v1"
id: "AUDIT-20260509T083141Z-audit-pass-worktree"
created: "2026-05-09T08:31:41.425Z"
scope: "worktree"
verdict: "pass"
auditor: "codex-lead"
worktreeHash: "a19b694381e8b120"
---

# Audit pass worktree

Scope: worktree
Verdict: pass
Auditor: codex-lead
Worktree hash: a19b694381e8b120

Notes: Audit passed for clean committed-state gate fix: root cause was pre-commit dirty-hash evidence being reused after commit plus platform-specific line endings in guide source hashing. Kernel now treats clean branch state as clean and hashes guide inputs canonically.
