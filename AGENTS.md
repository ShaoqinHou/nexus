# Nexus Codex Instructions

Nexus uses a Codex-native workflow rooted at `.codex/`. Start every non-trivial task by reading:

1. `.codex/README.md`
2. `.codex/workflow/current-state.md`
3. The closest relevant file under `.codex/knowledge/`

Then run:

```bash
node .codex/scripts/nexus-workflow.mjs status
```

Use one canonical workflow ladder:

1. `npm run workflow:status` for the cheap resume snapshot.
2. `npm run workflow:health` when diagnosing a complex or stale session.
3. `npm run workflow:release-gate` before committing or handing over local work.
4. `npm run workflow:deployed-gate` after hosted/server validation when deployment is in scope.

Other workflow scripts are helpers for creating records or diagnosing a failed gate. Do not turn them into a parallel closeout checklist.

For workflow migration, architecture changes, or second-project setup, also read `.codex/workflow/principles.md`, `.codex/workflow/capabilities.md`, and `.codex/workflow/templates/project-bootstrap.md` before editing workflow scripts, policy, hooks, or project instructions.

## Project Shape

Nexus is a multi-tenant mini-app platform. The first module is restaurant ordering.

- `packages/api`: Hono HTTP API, Drizzle ORM, SQLite.
- `packages/web`: React 19, Vite, TanStack Router, TanStack Query, Tailwind v4.
- `packages/shared`: shared constants and types.
- `design/reference/v1/nexus-design-system`: frozen design-system reference bundle.

## Hard Rules

- Every tenant-scoped DB query must filter by `tenantId`.
- Backend modules keep the `routes.ts -> service.ts -> schema.ts` boundary.
- Frontend apps do not import from other apps. UI primitives are domain-free.
- Server state uses TanStack Query and module query-key factories.
- User-visible text uses `t()` and every key exists in all five locales.
- Use design tokens and `data-theme`; do not add raw hex, rgba, or Tailwind color-scale styling in app chrome.
- Do not edit `design/reference/v<N>/`; add a new version folder for a new design export.
- Use Lucide for utility icons and `DietaryIcon` for dietary/allergen/spice/promo markers.

## Codex Workflow

- Use repo skills in `.agents/skills` for workflow, review, verification, and audits.
- Record durable state under `.codex/workflow/records` instead of relying on the chat transcript.
- Capture durable solo-dev user intent and lead work slices with Work Intake records instead of creating one-off planning docs. Valid intent kinds are policy-owned in `.codex/workflow/policy/intake.json`; do not duplicate the list in prose:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-intent --kind <policy-kind> --status captured --summary "<compact user intent>"
  node .codex/scripts/nexus-workflow.mjs record-work-slice --intent <INTENT-id> --status active --summary "<lead interpretation>" --acceptance "<done signals>" --verification "<checks>"
  ```
- Link substantive routing, patch, review, verification, audit, and deployment records to the relevant work slice with `--work-slice <WORK-SLICE-id>`.
- Close each current work slice with `close-work-slice` before branch release. The release gate rejects branch evidence linked to an open slice:
  ```bash
  node .codex/scripts/nexus-workflow.mjs close-work-slice --slice <WORK-SLICE-id> --status done --notes "<evidence complete>"
  ```
- Keep mutable cache under `.codex/workflow/state` and runtime telemetry under `.codex/workflow/runtime`; neither is durable evidence.
- Workflow truth is append-only records plus git/worktree/branch state. Caches and generated guide pages must be delete-safe aids, not required human memory.
- Treat `.codex/scripts/nexus-workflow.mjs` as the Nexus deterministic workflow wrapper and `.codex/scripts/workflow-engine.mjs` as the reusable profile/policy loader. Hooks, package scripts, server checks, and future CI should call the wrapper; LLM judgment should be recorded as review/verify/audit/routing/pattern evidence for the kernel to validate.
- Put project-specific workflow facts in `.codex/workflow/profile.json` and `.codex/workflow/policy/*.json` before hardcoding them in scripts. The policy pack owns file classifiers, review-kind classifiers, required files, record schemas, guide contracts, design-system inputs, hook expectations, and deployment URLs.
- The workflow system self-checks are `npm run workflow:inventory-check`, `npm run workflow:policy-check`, and `npm run workflow:trace-check`. They are part of the release gate and should be used directly only to diagnose `.codex` file placement, policy consumption, or command execution telemetry.
- The Work Intake self-check is `npm run workflow:work-intake-check`. It is part of health/release validation and should be used directly to diagnose orphan patches, missing intent/work-slice links, stale active slices, or invalid external references.
- Treat committed pattern proposal, routing, patch, review, test, audit, and deployment records as append-only evidence. If evidence is wrong, create a correction record instead of editing the old one.
- Treat hooks as thin triggers only. They can invalidate gates or block common unsafe commit forms, but review/verify/audit judgment must be done by the lead or a focused agent and recorded explicitly. See `.codex/knowledge/hooks.md` for examples and limits.
- Project `.codex/config.toml` and `.codex/hooks.json` are active only in trusted Codex sessions. Always keep explicit script gates as the reliable source of enforcement.
- For this project, use `Custom (config.toml)` after the project is trusted when hook loading matters; it uses the checked-in no-prompt config. Full access grants permissions for the current session but does not prove hooks/config loaded.
- The canonical execution route is `status -> health when needed -> release-gate -> deployed-gate when deployed`. Hooks, review checks, verification checks, audit checks, guide checks, and branch checks support that route; they are not competing workflows.
- When a repeated issue, undocumented invariant, deprecated pattern, or useful project convention is discovered, create an evidence-based proposal before changing durable guidance:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-pattern --summary "<finding>" --evidence "<files/tests/reviews>" --guidance "<candidate rule>" --files "a,b"
  ```
- Promote a pattern into `.codex/knowledge/*` only after checking the source code, reference docs, history, or tests. Cite the proposal record in the guidance or an adjacent decision record.
- After code edits, run or record the focused review evidence needed by the release gate:
  ```bash
  node .codex/scripts/nexus-workflow.mjs review-check
  ```
- Review records are typed. Use `--kind general|pattern|design|workflow|integrated`; design-system/workflow/parallel changes require the matching focused review kind.
- For user-facing, API, design-system, workflow, or cross-cutting changes, verification and audit evidence are required before final handover/release:
  ```bash
  node .codex/scripts/nexus-workflow.mjs verify-check
  node .codex/scripts/nexus-workflow.mjs audit-check
  ```
- Generated workflow guide artifacts also require browser evidence before release:
  ```bash
  node .codex/scripts/nexus-workflow.mjs guide-browser-check
  ```
- Branches require branch-diff evidence before release, even when the checkout is clean. Use a branch-scope patch record for the whole branch diff, not only small worktree patch records:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-patch --scope branch --summary "<branch summary>" --worker <lead-worker> --work-slice <WORK-SLICE-id>
  node .codex/scripts/nexus-workflow.mjs branch-evidence-check
  ```
- Worktree-scope patch/review/verify/audit records should not carry branch hashes. Branch hashes belong to branch-scope closing records.
- Worktree-scope records are interim evidence while coding. Before release on a branch with substantive diff, close the branch with branch-scope records tied to the current branch hash:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-patch --scope branch --summary "<branch summary>" --worker <lead-worker> --work-slice <WORK-SLICE-id>
  node .codex/scripts/nexus-workflow.mjs record-review --scope branch --kind general --verdict pass --reviewer <name> --work-slice <WORK-SLICE-id> --notes "<summary>"
  node .codex/scripts/nexus-workflow.mjs record-verify --scope branch --verdict pass --verifier <name> --work-slice <WORK-SLICE-id> --commands "<timed-command-ids>" --notes "<commands/results>"
  node .codex/scripts/nexus-workflow.mjs record-audit --scope branch --verdict pass --auditor <name> --work-slice <WORK-SLICE-id> --commands "<timed-command-ids>" --notes "<summary>"
  ```
- Add the required focused branch review kinds for the actual diff, such as `workflow`, `design`, `pattern`, or `integrated`. The release gate prints the missing kind when one is required.
- For interim worktree review passes, record it:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --kind <general|pattern|design|workflow|integrated> --verdict pass --reviewer <name> --work-slice <WORK-SLICE-id> --notes "<summary>"
  ```
- For interim worktree verification and audit evidence:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-verify --scope worktree --verdict pass --verifier <name> --work-slice <WORK-SLICE-id> --commands "<timed-command-ids>" --notes "<commands/results>"
  node .codex/scripts/nexus-workflow.mjs record-audit --scope worktree --verdict pass --auditor <name> --work-slice <WORK-SLICE-id> --commands "<timed-command-ids>" --notes "<summary>"
  ```
- Passing verify/audit/deployment records that cite command IDs must be created after running those commands through `npm run workflow:run`; the kernel embeds compact command summaries in the durable record and gates reject missing, failed, or timed-out command evidence.
- Before commit or final local handover, run the canonical release gate:
  ```bash
  npm run workflow:release-gate
  ```

## Model Routing

Use subagents only when delegation materially helps.

- Use `nexus_researcher` or built-in `explorer` for read-only mapping.
- Use `.codex/knowledge/model-routing.md` as the source of truth for lead/worker routing.
- Use `nexus_spark_worker` only for small, heavily guided edits with narrow write scope, explicit expected behavior, and clear tests.
- Use `nexus_strong_worker` as a normal coding worker for ambiguous debugging, architecture, cross-cutting refactors, design judgment, visual validation, deployment issues, and any task where missing context is dangerous.
- Before delegating, the lead must classify the task against the Spark-allowed and Spark-forbidden criteria. Do not use Spark first and hope it self-corrects.
- For non-trivial delegation, record a routing preflight:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-routing --summary "<task>" --route <lead|spark|strong|research|review|integrated-review|escalate> --worker <agent> --files "a,b" --verification "<commands>" --fallback-trigger "<when>" --fallback-target "<agent>"
  ```
- `escalate-to-strong` is accepted only as a compatibility alias and is stored as `escalate`.
- When recording a delegated patch, pass the worker name and routing id so integrated review and routing checks can see the real participants:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-patch --summary "<slice>" --worker <agent> --routing <ROUTING-id> --files "a,b"
  ```
- Close a worker routing slice when it is done:
  ```bash
  node .codex/scripts/nexus-workflow.mjs complete-routing --routing <ROUTING-id> --notes "<outcome>"
  ```
- If Spark receives a task that violates its criteria, it must refuse/escalate before editing. If it fails tests, stalls, loops, edits outside scope, or produces shallow output, stop that worker and escalate to `nexus_strong_worker` or the lead model.
- Use `nexus_pattern_reviewer` after substantive code changes.
- Use `nexus_design_reviewer` for visual/design-system changes.
- For parallel worker edits, run one final integrated review on the merged worktree hash before recording review pass.

## Git Note

This Codex worktree is linked from the nested monoWeb repository. If plain `git` reports that it is not in a worktree, use the workflow script or explicitly set the linked worktree git directory:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```

Do not treat status output from the submodule common git dir as the worktree state.
