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
- Treat `.codex/scripts/nexus-workflow.mjs` as the deterministic workflow kernel. Hooks, package scripts, server checks, and future CI should call it; LLM judgment should be recorded as review/verify/audit/routing/pattern evidence for the kernel to validate.
- Treat committed pattern proposal, routing, patch, review, test, audit, and deployment records as append-only evidence. If evidence is wrong, create a correction record instead of editing the old one.
- Treat hooks as thin triggers only. They can invalidate gates or block common unsafe commit forms, but review/verify/audit judgment must be done by the lead or a focused agent and recorded explicitly. See `.codex/knowledge/hooks.md` for examples and limits.
- Project `.codex/config.toml` and `.codex/hooks.json` are active only in trusted Codex sessions. Always keep explicit script gates as the reliable source of enforcement.
- When a repeated issue, undocumented invariant, deprecated pattern, or useful project convention is discovered, create an evidence-based proposal before changing durable guidance:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-pattern --summary "<finding>" --evidence "<files/tests/reviews>" --guidance "<candidate rule>" --files "a,b"
  ```
- Promote a pattern into `.codex/knowledge/*` only after checking the source code, reference docs, history, or tests. Cite the proposal record in the guidance or an adjacent decision record.
- After code edits, run a focused review before commit:
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
- After review passes, record it:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --kind <general|pattern|design|workflow|integrated> --verdict pass --reviewer <name> --notes "<summary>"
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
- Use `.codex/knowledge/model-routing.md` as the source of truth for lead/worker routing.
- Use `nexus_spark_worker` only for small, heavily guided edits with narrow write scope, explicit expected behavior, and clear tests.
- Use `nexus_strong_worker` as a normal coding worker for ambiguous debugging, architecture, cross-cutting refactors, design judgment, visual validation, deployment issues, and any task where missing context is dangerous.
- Before delegating, the lead must classify the task against the Spark-allowed and Spark-forbidden criteria. Do not use Spark first and hope it self-corrects.
- For non-trivial delegation, record a routing preflight:
  ```bash
  node .codex/scripts/nexus-workflow.mjs record-routing --summary "<task>" --route <lead|spark|strong|research|review|integrated-review|escalate-to-strong> --worker <agent> --files "a,b" --verification "<commands>" --fallback-trigger "<when>" --fallback-target "<agent>"
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
