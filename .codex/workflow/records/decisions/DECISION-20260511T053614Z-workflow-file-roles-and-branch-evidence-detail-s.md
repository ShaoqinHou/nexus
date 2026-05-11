---
schema: "nexus-decision/v1"
id: "DECISION-20260511T053614Z-workflow-file-roles-and-branch-evidence-detail-s"
created: "2026-05-11T05:36:14.175Z"
author: "codex"
---

# Workflow file roles and branch evidence detail should be policy-owned and lightweight

Accepted after data-shape audit. Policy/files.json owns inventory.roleTaxonomy and artifact/handover budgets; records.json owns body file-list limits; compatibility.json owns legacy record exceptions. Branch patch records own full branch file lists, while branch reviews/verifications/audits/deployments can reference branch hash and linked patch so future LLMs do not need repeated large inventories.
