---
schema: "nexus-work-slice/v1"
id: "WORK-SLICE-20260511T143903Z-work-slice-done-add-policy-owned-activity-tracin"
created: "2026-05-11T14:39:03.836Z"
status: "done"
sourceType: "user-intent"
owner: "codex-lead"
intentIds: ["INTENT-20260511T140607Z-intent-maintenance-improve-portable-workflow-tra"]
summary: "Add policy-owned activity tracing for long lead phases and enforce it through low-cost deterministic workflow checks"
publicSummary: "Add policy-owned activity tracing for long lead phases and enforce it through low-cost deterministic workflow checks"
area: ""
priority: ""
acceptance: "Long non-command workflow phases are represented by durable activity records; branch/release checks detect future unexplained gaps; implementation remains portable and policy-driven; runtime overhead remains bounded to record metadata scans"
verification: "activity smooth/failure tests, policy/inventory/trace/work-intake checks, workflow self-test, release gate"
files: []
externalRefs: []
tags: []
updatesWorkSliceId: "WORK-SLICE-20260511T140619Z-work-slice-active-add-policy-owned-activity-trac"
supersedesWorkSliceIds: []
blockedByWorkSliceIds: []
deploymentRequired: false
openedAt: "2026-05-11T14:39:03.835Z"
---

# Work slice done Add policy-owned activity tracing for long lead phases and enforce it through low-cost deterministic workflow checks

Status: done
Source type: user-intent
Owner: codex-lead
Intent IDs: INTENT-20260511T140607Z-intent-maintenance-improve-portable-workflow-tra
Updates work slice: WORK-SLICE-20260511T140619Z-work-slice-active-add-policy-owned-activity-trac
Lead understanding: Add policy-owned activity tracing for long lead phases and enforce it through low-cost deterministic workflow checks
Acceptance criteria: Long non-command workflow phases are represented by durable activity records; branch/release checks detect future unexplained gaps; implementation remains portable and policy-driven; runtime overhead remains bounded to record metadata scans
Non-goals: n/a
Verification plan: activity smooth/failure tests, policy/inventory/trace/work-intake checks, workflow self-test, release gate
Files / scope hints: n/a
Notes: Activity tracing is implemented as a policy-owned workflow capability, adapters are synced, the portable empty-project fixture passes activity-check, and timed validation shows the new check is sub-second metadata work with no watcher or background process.
