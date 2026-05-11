---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260511T000635Z-pattern-accepted-tenant-accent-override-stays-te"
created: "2026-05-11T00:06:35.111Z"
status: "accepted"
reporter: "codex"
reviewer: "codex-lead"
evidence: "ThemeProvider wrapper/body scoping, tenant-settings route/service/schema validation, ThemeProvider and tenant-theme isolation tests, design-parity-full-tests-final-20260511, design-parity-live-zoo-final-20260511, pattern reviewer Helmholtz 2026-05-11"
files: ["packages/web/src/platform/theme/ThemeProvider.tsx","packages/web/src/lib/theme.ts","packages/web/src/apps/ordering/merchant/ThemeSettings.tsx","packages/api/src/routes/tenant-settings/routes.ts","packages/api/src/routes/tenant-settings/schema.ts","packages/api/src/routes/tenant-settings/service.ts",".codex/knowledge/design-system.md"]
---

# Pattern accepted Tenant accent override stays tenant-scoped and layers on cuisine theme variables

Status: accepted
Reporter: codex
Reviewer: codex-lead
Decision: Accepted after code review, focused tests, live Zoo verification, and pattern-review feedback confirmed the rule is project-wide durable guidance.

Summary: Tenant accent override stays tenant-scoped and layers on cuisine theme variables

Evidence: ThemeProvider wrapper/body scoping, tenant-settings route/service/schema validation, ThemeProvider and tenant-theme isolation tests, design-parity-full-tests-final-20260511, design-parity-live-zoo-final-20260511, pattern reviewer Helmholtz 2026-05-11

Proposed guidance: When supporting tenant accent overrides, store accentColor in tenant settings, validate hex or empty deletion at the API boundary, apply --color-accent and --color-accent-light only on tenant-scoped wrappers and body portal scope, and remove those variables on unmount/clear so pre-tenant chrome remains neutral.

Files:
- packages/web/src/platform/theme/ThemeProvider.tsx
- packages/web/src/lib/theme.ts
- packages/web/src/apps/ordering/merchant/ThemeSettings.tsx
- packages/api/src/routes/tenant-settings/routes.ts
- packages/api/src/routes/tenant-settings/schema.ts
- packages/api/src/routes/tenant-settings/service.ts
- .codex/knowledge/design-system.md

Notes: Supersedes the earlier proposed record PATTERN-PROPOSAL-20260510T233156Z-pattern-proposed-tenant-accent-override-stays-te.

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
