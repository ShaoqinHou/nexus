---
name: nexus-review
description: Review Nexus code changes against project standards. Use after substantive edits, before commits, for patch-review records, for detecting pattern drift, or when checking tenant isolation, design-system compliance, related updates, tests, and deprecated approaches.
---

# Nexus Review

## Inputs

- `AGENTS.md`
- `.codex/knowledge/patterns.md`
- `.codex/knowledge/design-system.md` when UI/theme/design files changed
- The current diff or the named commit diff
- Related tests and records under `.codex/workflow/records/`
- Work-intake records under `.codex/workflow/records/intents/` and `.codex/workflow/records/work-slices/` when the diff implements user intent

## Review Focus

Lead with real findings only:

- patch records linked to the correct active work slice for user-facing, workflow, design, or product-intent work,
- tenant isolation and auth boundaries,
- route/service/schema layering,
- import boundaries,
- missing Zod validation,
- missing related updates,
- i18n coverage,
- design tokens and theme cascade,
- registry and zoo coverage,
- missing tests or weak assertions,
- deployment/subpath risks.

## Process

1. Map the changed files and likely coupled files.
2. Inspect the relevant project knowledge file.
3. Review the diff and surrounding code.
4. For workflow/product-intent work, run or inspect `npm run workflow:work-intake-check`; treat missing or wrong work-slice links as review findings.
5. Return findings ordered by severity with file/line references.
6. When a finding suggests a recurring mistake or undocumented invariant, create a pattern proposal with evidence instead of silently editing durable guidance.
7. If no issues are found, say that and list residual test or validation risk.
8. Record the result when appropriate:
   `node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --kind <general|pattern|design|workflow|integrated> --verdict pass --reviewer <name> --work-slice <WORK-SLICE-id> --notes "<summary>"`

## Output Shape

Use a code-review stance:

- Findings first.
- Open questions or assumptions second.
- Brief change/test summary last.
