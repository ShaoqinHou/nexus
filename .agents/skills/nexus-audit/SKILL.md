---
name: nexus-audit
description: Audit Nexus project consistency and workflow health. Use for whole-tree checks, historical-case testing, pattern discovery, recurring mistake capture, design-system drift, review-trigger reliability, model-routing evaluation, or before release.
---

# Nexus Audit

## Start

1. Read `AGENTS.md`.
2. Read `.codex/knowledge/patterns.md`.
3. Read `.codex/knowledge/design-system.md` for UI/theme audits.
4. Run `node .codex/scripts/nexus-workflow.mjs status`.

## Audit Areas

- tenant isolation,
- route/service/schema boundaries,
- frontend import boundaries,
- TanStack Query and query-key usage,
- i18n coverage,
- design token usage,
- registry and zoo coverage,
- test depth,
- deployment/subpath assumptions,
- workflow record completeness,
- model routing and fallback evidence,
- review trigger evidence.
- dynamic pattern proposals under `.codex/workflow/records/pattern-proposals/`.

## Output

Produce a concise table sorted by severity:

- issue,
- evidence path/line,
- impact,
- suggested fix,
- whether durable pattern guidance should be updated.

Record a passing audit gate when the audit is complete:

```bash
node .codex/scripts/nexus-workflow.mjs record-audit --scope worktree --verdict pass --auditor <name> --notes "<summary>"
```

Record durable discoveries as decisions or risks when they should survive the session.
For project patterns, first create a proposal with `record-pattern`; promote it into `.codex/knowledge/` only after verification.
