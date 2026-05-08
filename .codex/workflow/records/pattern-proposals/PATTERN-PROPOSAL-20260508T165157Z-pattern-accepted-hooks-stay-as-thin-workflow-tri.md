---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260508T165157Z-pattern-accepted-hooks-stay-as-thin-workflow-tri"
created: "2026-05-08T16:51:57.452Z"
status: "accepted"
reporter: "codex"
evidence: "User reminder during migration; .codex/hooks.json only dispatches events; DECISION-20260508T163832Z-workflow-mechanism-split.md records mechanism split; .codex/scripts/nexus-workflow.mjs hook handlers only inject/invalidate/block/remind."
files: [".codex/hooks.json",".codex/scripts/nexus-workflow.mjs",".codex/README.md","AGENTS.md"]
---

# Pattern accepted Hooks stay as thin workflow triggers

Status: accepted
Reporter: codex

Summary: Hooks stay as thin workflow triggers

Evidence: User reminder during migration; .codex/hooks.json only dispatches events; DECISION-20260508T163832Z-workflow-mechanism-split.md records mechanism split; .codex/scripts/nexus-workflow.mjs hook handlers only inject/invalidate/block/remind.

Proposed guidance: Keep Codex hooks as compact dispatch/gate triggers. Review, verification, audit, and project judgment belong in agents, skills, knowledge files, and explicit records.

Files:
- .codex/hooks.json
- .codex/scripts/nexus-workflow.mjs
- .codex/README.md
- AGENTS.md

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
