---
name: consistency-audit
description: "Run a 6-layer consistency audit on the codebase. Detects duplicated patterns, inconsistent implementations, scattered state, type mismatches, and anti-patterns."
user_invocable: true
---

# Consistency Audit

Systematic 6-layer codebase audit. Read `references/audit-layers.md` for the full methodology, then execute the audit.

## Process

1. Read `references/audit-layers.md`
2. Run the grep queries for each layer
3. Sample 3-5 files per finding to verify
4. Output findings table sorted by severity
5. Recommend fixes with specific file paths

## Output Format

```markdown
| # | Layer | Violation | File(s) | Severity | Fix |
|---|-------|-----------|---------|----------|-----|
```

Severity: **High** (runtime risk, tenant leak, type safety), **Medium** (maintenance burden), **Low** (cosmetic)
