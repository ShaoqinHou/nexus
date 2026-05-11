# Work Intake

Work Intake is the lightweight traceability layer for solo-dev Codex work.

It records the chain:

`user intent -> lead work slice -> activity when needed -> patch -> review -> verify -> audit -> deployment`

The goal is not enterprise requirements documentation. The goal is to keep enough durable context for future agents and humans to know why work exists, what Codex understood, what acceptance criteria were used, and what evidence proved completion.

## Source Of Truth

- Local `.codex/workflow/records/` records are canonical.
- The generated dashboard and public guide are views.
- External trackers such as GitHub Issues, Linear, or Jira are optional references only unless a future project policy explicitly changes `externalTrackerMode` to `required` or `disabled`.
- Hooks may remind or invalidate gates, but they must not decide product meaning or write intake judgment.

## Record Types

Use an intent record when a user prompt adds durable product/work meaning:

```bash
node .codex/scripts/nexus-workflow.mjs record-intent --kind feature --status captured --summary "<compact user intent>" --normalized "<lead-normalized meaning>"
```

Use a work-slice record when the lead decides what should be built, fixed, researched, or deferred:

```bash
node .codex/scripts/nexus-workflow.mjs record-work-slice --intent <INTENT-id> --status active --summary "<lead interpretation>" --acceptance "<done signals>" --verification "<planned checks>"
```

For pure internal workflow/bookkeeping work, use:

```bash
node .codex/scripts/nexus-workflow.mjs record-work-slice --source-type workflow-maintenance --status active --summary "<maintenance slice>" --acceptance "<done signals>"
```

Close a slice with a new append-only record, not by editing the original active record:

```bash
node .codex/scripts/nexus-workflow.mjs close-work-slice --slice <WORK-SLICE-id> --status done --notes "<why the slice is closed>"
```

Use `verified` when validation is complete but deployment is still separate, `done` when local/deployed evidence is complete, `deferred` when intentionally postponed, and `superseded` when another slice replaces it.

Use an activity record when a work slice has real lead work that command telemetry or patch/review evidence will not explain, such as long research, design, implementation, audit-wait, validation, deployment, or handover phases:

```bash
node .codex/scripts/nexus-workflow.mjs record-activity --work-slice <WORK-SLICE-id> --kind implementation --status completed --summary "<phase summary>" --started-at "<iso>" --ended-at "<iso>"
```

Activity records are not a transcript. They are compact intervals or progress points that let release/health gates reject future unexplained gaps without adding a background watcher or slow runtime scan. Open activity statuses can cover current active work only until the policy-owned expiry; closed work should use completed intervals.

## Detail Level

Intent records should be small:

- kind,
- status,
- compact source summary,
- normalized meaning when useful,
- constraints or acceptance signals,
- parent/supersedes links when a later prompt clarifies or changes direction.

Work slices may be slightly richer:

- source intent ids or explicit maintenance source type,
- lead understanding,
- acceptance criteria,
- non-goals,
- affected areas or file hints,
- routing/verification plan,
- status.

Do not paste full chat transcripts into intake records.

## Evidence Links

Substantive activity, patch, routing, review, verification, audit, and deployment records should pass `--work-slice <WORK-SLICE-id>` so the guide can show traceability and the release gate can reject orphan work. The record commands inherit work-slice IDs from the current patch when possible, but explicit `--work-slice` is preferred because it leaves no ambiguity.

The intake gate centrally checks:

- current/branch patch, routing, review, verification, audit, and deployment evidence has work-slice links,
- `done` or `verified` slices have linked patch and review evidence,
- verification and audit relevance comes from both slice file hints and linked patch files,
- branch release cannot close while linked work slices remain `active`, `ready`, `review`, or `blocked`,
- external refs follow `externalTrackerMode` and allowed prefixes.

Before handover or commit, run the canonical release gate. Use the direct Work Intake and activity checks only to diagnose a failing health/release gate:

```bash
npm run workflow:release-gate
```

When the gate reports Work Intake or activity-trace problems, diagnose with:

```bash
npm run workflow:work-intake-check
npm run workflow:activity-check
```

## Presentation

The generated workflow guide shows:

- Work Intake Inbox,
- Active Work Slices,
- Intent Trace Graph,
- Feature Catalog,
- Work Intake Warnings.

These views are generated from append-only records. If the guide looks wrong, fix the records, policy, or generator, not the generated HTML by hand.
