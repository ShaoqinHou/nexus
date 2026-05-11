# Activity Record

Body reference only. Create durable activity records with the project wrapper from `.codex/workflow/profile.json` `paths.workflowWrapper` (Nexus: `node .codex/scripts/nexus-workflow.mjs record-activity ...`) so required frontmatter and work-slice links are generated.

Required fields:

- `kind`: policy-owned phase kind from `.codex/workflow/policy/intake.json` `activity.phaseKinds`.
- `status`: policy-owned status from `.codex/workflow/policy/intake.json` `activity.statuses`.
- `summary`: compact explanation of the phase, wait, or reasoning span.
- `workSliceIds`: one or more linked work slices.
- `startedAt` / `endedAt`: ISO timestamps when recording a long phase interval.

Use an activity record when lead work is real but not represented by timed commands, patches, reviews, or audits. Do not use it as a transcript dump.

Open statuses from policy can explain a current active interval, but they expire after `activity.maxOpenActivityMinutes` and must not remain open on a closed work slice. Prefer completed intervals for final handover/release evidence.

Activity summaries may appear in generated guide views. Use `--public-summary` when the durable private summary contains details that should not be surfaced in the public guide.
