---
schema: "nexus-decision/v1"
id: "DECISION-20260511T082941Z-use-policy-backed-fixed-path-adapters-for-workfl"
created: "2026-05-11T08:29:41.644Z"
author: "codex"
---

# Use policy-backed fixed-path adapters for workflow surfaces

Implemented a conservative adapter refactor: canonical project-specific sources live under .codex/workflow/project/adapters; .codex/workflow/policy/adapters.json owns exact-file and package-script targets; adapter-check is part of the release gate; adapter-sync/uninstall are explicit commands. This avoids a blanket generator while centralizing fixed surfaces such as AGENTS.md, WORKFLOW.md, Codex config/hooks/agents, repo skills, CI workflow, and package workflow scripts.
