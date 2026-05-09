---
schema: "nexus-decision/v1"
id: "DECISION-20260509T163717Z-branch-evidence-hashes-canonicalize-text-line-en"
created: "2026-05-09T16:37:17.812Z"
author: "codex"
---

# branch evidence hashes canonicalize text line endings

Server validation exposed a cross-platform branch hash mismatch: local Windows and Linux server worktrees hashed raw text bytes differently. The workflow kernel now canonicalizes text content before worktree/branch evidence hashing while preserving raw hashes for binary files. Self-test covers the line-ending case.
