---
schema: "nexus-decision/v1"
id: "DECISION-20260509T154952Z-workflow-pass-records-embed-durable-command-evid"
created: "2026-05-09T15:49:52.471Z"
author: "codex"
---

# Workflow pass records embed durable command evidence

Multi-agent audit found that command ids alone were not durable proof because runtime telemetry is local and mutable. The kernel now copies compact command summaries into verify/audit/deployment records and gates validate embedded commandEvidence plus durable artifacts; descriptive checks alone do not satisfy pass gates. Delegated worker branch evidence now also requires routing closeout records, and Zoo/Gym captures verify DOM theme/mode state before accepting screenshots.
