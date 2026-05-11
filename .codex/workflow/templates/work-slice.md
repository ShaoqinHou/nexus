# Work Slice Record Template

Body reference only. Create durable records with the project wrapper from `.codex/workflow/profile.json` `paths.workflowWrapper` (Nexus: `node .codex/scripts/nexus-workflow.mjs record-work-slice ...` or `close-work-slice ...`) so required frontmatter is generated and gates can validate the record.

Status: policy-owned in `.codex/workflow/policy/intake.json` `workSliceStatuses`

Source Type: policy-owned in `.codex/workflow/policy/intake.json` `sourceTypes`

Intent IDs:

Lead Understanding:

Acceptance Criteria:

Non-Goals:

Affected Areas / File Hints:

Routing Plan:

Verification Plan:

Deployment Required:

Updates Work Slice:

Supersedes Work Slices:

External Refs:

Closeout:

- Create a new record with `close-work-slice --slice <WORK-SLICE-id> --status <verified|done|deferred|superseded>`.
- Do not edit the original active record after it is committed.

Notes:
