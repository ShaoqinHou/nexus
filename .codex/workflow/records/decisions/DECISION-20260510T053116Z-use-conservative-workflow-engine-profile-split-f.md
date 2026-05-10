---
schema: "nexus-decision/v1"
id: "DECISION-20260510T053116Z-use-conservative-workflow-engine-profile-split-f"
created: "2026-05-10T05:31:16.513Z"
author: "codex"
---

# Use conservative workflow engine/profile split for second-project reuse

Decision: keep public Nexus commands stable, add reusable workflow-engine.mjs for profile/policy loading and path-policy helpers, and move Nexus facts into .codex/workflow/profile.json plus .codex/workflow/policy/*.json. Do not split into many tiny modules yet; move more code into the engine only after a second project validates the boundary. Evidence: .codex/workflow/research/workflow-engine-profile-extraction-2026-05-10.md and timed commands extraction-after-self-test/extraction-after-routing.
