---
schema: "nexus-decision/v1"
id: "DECISION-20260510T075053Z-keep-historical-audit-in-review-records-as-legac"
created: "2026-05-10T07:50:53.286Z"
author: "codex"
---

# Keep historical audit-in-review records as legacy evidence

Read-only .codex audit found two 2026-05-08 audit records stored under records/reviews with kind=audit. They are committed historical evidence from before first-class records/audits existed. The workflow intentionally keeps them in place and maps them as legacy audits instead of moving or rewriting them, because committed evidence records are append-only. New audit evidence must use records/audits with schema nexus-audit/v1.
