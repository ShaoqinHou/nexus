---
schema: "nexus-decision/v1"
id: "DECISION-20260509T152030Z-workflow-proof-model-simplified-around-records-g"
created: "2026-05-09T15:20:30.878Z"
author: "codex"
---

# Workflow proof model simplified around records git and gates

Audit found phase sprawl and patch-on-patch risks. The adopted model is: records plus git are truth; state/runtime/generated guide surfaces are aids; status is cheap; health/release gates do heavy checks; branch hashes live on branch-scope closing records; delegated worker proof is explicit routing plus worker patch plus closeout; deployment is separate from local release readiness.
