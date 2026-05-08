---
schema: "nexus-test/v1"
id: "TEST-20260508T172218Z-hook-command-subdirectory-dispatch"
created: "2026-05-08T17:22:18.862Z"
author: "codex"
---

# Hook command subdirectory dispatch

Updated .codex/hooks.json commands to locate .codex/scripts/nexus-workflow.mjs by walking up from session cwd instead of relying on git rev-parse, because this linked worktree resolves git root incorrectly. Validated hooks.json parses and SessionStart dispatch works from packages/web/src.
