# Verification Evidence

Verification records must separate machine-checkable proof from human-inspection artifacts.

## Command Evidence

Long-running workflow commands should be run through the timed workflow runner when practical:

```bash
npm run workflow:run -- --id <meaningful-id> --timeout-ms <ms> -- npm run <script>
```

The runner writes local JSONL telemetry under `.codex/workflow/runtime/command-runs.jsonl`, including start/end time, duration, exit code, timeout status, and output tails. Runtime telemetry is operational evidence for the current checkout; durable pass/fail conclusions still belong in explicit `TEST-*`, review, audit, or deployment records.

When `record-verify`, `record-audit`, or `record-deployment` records a passing verdict with `--commands`, the workflow kernel copies a compact command summary into the durable record frontmatter as `commandEvidence`. Release and deployment gates validate that embedded summary, not the mutable runtime file. Command IDs that have no runtime entry, failed, or timed out cannot be recorded as passing evidence.

Passing verification and audit records must reference execution evidence, not only prose. Use `--commands`/`--command-ids` for timed runner ids and `--artifacts`/`--evidence` for durable summaries, screenshots, or deployment artifacts. Freeform checks are descriptive and do not satisfy a pass gate by themselves:

```bash
node .codex/scripts/nexus-workflow.mjs record-verify --scope branch --verdict pass --verifier <lead-worker> --commands local-self-test,local-release-gate --notes "<summary>"
node .codex/scripts/nexus-workflow.mjs record-audit --scope branch --verdict pass --auditor <lead-worker> --commands local-self-test --artifacts ".codex/workflow/records/reviews/REVIEW-id.md" --notes "<summary>"
```

When a passing record cites a local artifact, the workflow kernel embeds the artifact path, byte count, and SHA-256 hash into the record. Later gates compare the embedded hash to the file on disk. Mutable runtime/state files under `.codex/workflow/runtime/` or `.codex/workflow/state/` are rejected as durable pass artifacts, and remote artifact URLs require command evidence showing how the URL was fetched or validated.

## Screenshot Evidence

Screenshots are supporting evidence, not the gate by themselves. A screenshot record should answer:

- what claim was verified,
- which target was opened, such as a file URL, localhost URL, or public URL,
- which commit, worktree hash, generated artifact hash, and deployment target were involved,
- which viewport, theme, route, and role were used,
- what deterministic checks passed, such as HTTP status, page title, image count, broken image count, console errors, or app-specific assertions,
- where the human-readable screenshot previews live.

Use screenshots for human inspection and communication. Use scripts, summaries, and workflow records for pass/fail decisions.

## Format Choice

- Use compressed JPEG previews for broad rendered-page evidence where the deterministic checks prove the key claim and the screenshot is only for human inspection.
- Use PNG or another lossless artifact for pixel comparison, visual regression baselines, exact color/token debugging, small UI crops, or accessibility/contrast investigations where compression artifacts could hide the issue.
- Do not commit large full-page screenshots unless the full-page layout itself is the claim. Prefer viewport screenshots plus a `summary.json` that records the complete machine-checkable result.
- For the Design Zoo/Gym, the deployed visual guide already carries full route screenshots. Browser-validation evidence should only prove the guide and key viewports render; it should not duplicate the whole Zoo/Gym gallery as another evidence set.

## Storage

Store bounded evidence under `.codex/workflow/artifacts/` and link it from a durable record under `.codex/workflow/records/`.

For guide-browser evidence, include:

- a `summary.json` with target URLs, viewport sizes, titles, image counts, and broken image counts,
- duration telemetry for the overall finalizer and each browser target,
- representative desktop/mobile screenshot previews,
- the local internal dashboard artifact, the public guide artifact, and the visual Zoo/Gym artifact,
- a `GUIDE-BROWSER-*` record tied to the current guide artifact hash,
- separate deployment records for public/server validation.

Use `npm run workflow:guide-browser-finalize` instead of manually sequencing guide generation and screenshot capture. The command regenerates guide artifacts first, captures deterministic browser evidence, then records the guide-browser pass last so the hash-bound evidence does not immediately stale itself.

Deployment is a separate proof from local release readiness. Use `record-deployment --verdict pass --target <server/url> --commands <ids> --checks <health/log/asset checks>` after server validation, then run `npm run workflow:deployed-gate` when the task requires hosted validation. A passing deployment record needs command evidence or durable artifact evidence; `--checks` documents what was inspected but is not proof by itself. Guide deployments also embed the current generated guide artifact hash and file metadata so the deployment gate can reject records that validated an older guide.

Deployment records are self-referential for generated guide artifacts: the record proves which public guide files were deployed, so the Work Intake guide trace uses policy-owned self-reference exclusions and intentionally omits current deployment proof while gates and records keep deployment proof first-class. Do not fix a missing deployment trace by forcing deployment records into the guide artifact that the same record validates; that creates an impossible stale-proof loop.

If evidence files become large or repetitive, keep the record and summary in git and move bulky raw artifacts to a deliberate artifact store. Do not let screenshot folders become an unbounded transcript substitute.
