---
name: consistency-audit
description: "Run a deterministic consistency audit against the nexus standards registry. Detects violations of SSOT, import boundaries, tenant isolation, design tokens, i18n coverage, and test depth. Standards source: .claude/workflow/design/standards.md."
user_invocable: true
---

# Consistency Audit

Deterministic codebase audit driven by `.claude/workflow/design/standards.md` — the same registry the Reviewer agent uses for per-commit review. This skill runs the detection recipes across the whole tree (Reviewer runs them per-diff).

## Process

1. **Read `.claude/workflow/design/standards.md`** — this is the source of truth. Each entry has an ID (`S-*`), a rule, a detection recipe, and a severity.
2. **Run each standard's detection recipe** against the whole repo using Grep/Glob.
3. **Sample 3–5 hits per standard** to distinguish real violations from false positives (especially for heuristic detections like S-TOUCH-TARGET-48).
4. **Output findings table** sorted by severity (critical → high → medium → low).
5. **Recommend fixes** with specific file paths + trap-registry entry from CLAUDE.md if applicable.

## When to use this skill

- **On demand** — "audit the codebase" / "check consistency" / "find SSOT violations"
- **Before a release** — full-tree sweep when per-commit review has not run (e.g. old commits from before the review loop was wired)
- **After major refactor** — verify no cross-cutting rules were missed
- **Periodic sanity check** — once a month, even if review loop is running clean

The per-commit `/commit-review` skill is different: it audits ONE commit's diff. This skill audits the entire tree.

## Output Format

```markdown
## Audit summary
- Standards checked: N
- Violations found: N (critical: N, high: N, medium: N, low: N)
- Files with violations: N

## Violations by standard

### S-<ID> — <one-line rule>
Severity: <level> | Hits: N

| # | File:Line | Offender | Suggested Fix |
|---|-----------|----------|---------------|

### S-<ID> — ...
```

## Priority standards (always check these first)

For a quick audit, these are the highest-signal:

1. `S-TENANT-ISOLATION` — missing `eq(.tenantId, tenantId)` on DB queries (critical, data leak)
2. `S-SERVICE-PURE-PARAMS` — services reading Hono context (critical, couples layers)
3. `S-ROUTES-DELEGATE` — `db.*()` in `routes.ts` (high, layer skip)
4. `S-ZOD-VALIDATION` — write routes without Zod (high, trust boundary)
5. `S-IMPORT-BOUNDARIES-APPS` + `MODULES` + `UI` (critical, architectural drift)
6. `S-NO-HARDCODE-COLORS` + `S-NO-HARDCODE-PIXELS` (high, theme drift)
7. `S-I18N-MANDATORY` — static JSX without `t()` (high, i18n break)
8. `S-TESTS-L1` — services without unit tests (high, confidence)
9. `S-TENANT-ISOLATION-TEST` — modules without cross-tenant test (high, silent-regression risk)

## Fallback layers (legacy 6-layer framework)

`references/audit-layers.md` contains the prior 6-layer audit framework (DATA / BEHAVIOR / VISUAL / CODE / STATE / ANIMATION). It's kept as a conceptual cross-check — use it when you want to reason about consistency at a higher level than individual standards. But the primary source of truth for what to check is `standards.md`.

## Severity bands

- **Critical** — tenant leak, auth bypass, type safety break, runtime crash risk
- **High** — maintainability debt, token drift, i18n coverage, missing tests
- **Medium** — convention drift, minor layer skip, stylistic
- **Low** — cosmetic, naming, comments

Use these to prioritize fixes. Critical gets fixed immediately; high gets scheduled; medium/low tracked but not blocking.
