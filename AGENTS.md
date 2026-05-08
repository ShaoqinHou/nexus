# Nexus Codex Instructions

Nexus uses a Codex-native workflow rooted at `.codex/`. Start every non-trivial task by reading:

1. `.codex/README.md`
2. `.codex/workflow/current-state.md`
3. The closest relevant file under `.codex/knowledge/`

Then run:

```bash
node .codex/scripts/nexus-workflow.mjs status
```

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
- Treat hooks as thin triggers only. They can invalidate gates or block an unsafe commit, but review/verify/audit judgment must be done by the lead or a focused agent and recorded explicitly.
- When a repeated issue, undocumented invariant, deprecated pattern, or useful project convention is discovered, create an evidence-based proposal before changing durable guidance:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-pattern --summary "<finding>" --evidence "<files/tests/reviews>" --guidance "<candidate rule>" --files "a,b"
  ```
- Promote a pattern into `.codex/knowledge/*` only after checking the source code, reference docs, history, or tests. Cite the proposal record in the guidance or an adjacent decision record.
- After code edits, run a focused review before commit:
  ```bash
  node .codex/scripts/nexus-workflow.mjs review-check
  ```
- For user-facing, API, design-system, workflow, or cross-cutting changes, verification and audit evidence are required before final handover/release:
  ```bash
  node .codex/scripts/nexus-workflow.mjs verify-check
  node .codex/scripts/nexus-workflow.mjs audit-check
  ```
- After review passes, record it:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --verdict pass --reviewer <name> --notes "<summary>"
  ```
- Record verification and audit evidence:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-verify --scope worktree --verdict pass --verifier <name> --notes "<commands/results>"
  node .codex/scripts/nexus-workflow.mjs record-audit --scope worktree --verdict pass --auditor <name> --notes "<summary>"
  ```
- Before commit, run:
  ```bash
  node .codex/scripts/nexus-workflow.mjs validate --commit-gate
  ```

## Model Routing

Use subagents only when delegation materially helps.

- Use `nexus_researcher` or built-in `explorer` for read-only mapping.
- Use `nexus_spark_worker` only for small, heavily guided edits with narrow write scope and clear tests.
- Use `nexus_strong_worker` for ambiguous debugging, architecture, cross-cutting refactors, design judgment, visual validation, and any task where missing context is dangerous.
- If a Spark worker fails tests, stalls, edits outside scope, or gives shallow output, stop using that worker for the slice and escalate to `nexus_strong_worker` or the lead model.
- Use `nexus_pattern_reviewer` after substantive code changes.
- Use `nexus_design_reviewer` for visual/design-system changes.

## Git Note

This Codex worktree is linked from the nested monoWeb repository. If plain `git` reports that it is not in a worktree, use the workflow script or explicitly set the linked worktree git directory:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```

Do not treat status output from the submodule common git dir as the worktree state.
