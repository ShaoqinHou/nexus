---
schema: "nexus-test/v1"
id: "TEST-20260508T164937Z-hook-invalidation-dry-run"
created: "2026-05-08T16:49:37.919Z"
author: "codex"
---

# Hook invalidation dry run

Manual PostToolUse payload for apply_patch updated patch-state.json and invalidated review/verify/audit gates without creating a durable patch record, matching the thin-hook policy.
