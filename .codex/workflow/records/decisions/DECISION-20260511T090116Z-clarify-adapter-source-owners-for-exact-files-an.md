---
schema: "nexus-decision/v1"
id: "DECISION-20260511T090116Z-clarify-adapter-source-owners-for-exact-files-an"
created: "2026-05-11T09:01:16.063Z"
author: "codex"
---

# Clarify adapter source owners for exact files and package scripts

Follow-up to architecture audit: exact-file adapter outputs are sourced from .codex/workflow/project/adapters, while package workflow scripts are sourced from .codex/workflow/policy/gates.json gates.packageScripts. .codex/workflow/policy/adapters.json now owns this sourceOwners map and policy-check validates owner docs mention the distinction.
