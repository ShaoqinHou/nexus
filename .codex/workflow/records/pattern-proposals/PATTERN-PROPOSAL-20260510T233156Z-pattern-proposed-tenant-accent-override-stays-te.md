---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260510T233156Z-pattern-proposed-tenant-accent-override-stays-te"
created: "2026-05-10T23:31:56.054Z"
status: "proposed"
reporter: "codex"
reviewer: ""
evidence: "packages/web/src/platform/theme/ThemeProvider.tsx,packages/web/src/lib/theme.ts,packages/web/src/apps/ordering/merchant/ThemeSettings.tsx,packages/api/src/routes/tenant-settings.ts,packages/api/src/__tests__/tenant-theme-isolation.test.ts,packages/web/src/platform/theme/__tests__/ThemeProvider.test.tsx,design-parity-focused-web-20260511,design-parity-api-settings-20260511"
files: ["packages/web/src/platform/theme/ThemeProvider.tsx","packages/web/src/lib/theme.ts","packages/web/src/apps/ordering/merchant/ThemeSettings.tsx","packages/api/src/routes/tenant-settings.ts",".codex/knowledge/design-system.md"]
---

# Pattern proposed Tenant accent override stays tenant-scoped and layers on cuisine theme variables

Status: proposed
Reporter: codex



Summary: Tenant accent override stays tenant-scoped and layers on cuisine theme variables

Evidence: packages/web/src/platform/theme/ThemeProvider.tsx,packages/web/src/lib/theme.ts,packages/web/src/apps/ordering/merchant/ThemeSettings.tsx,packages/api/src/routes/tenant-settings.ts,packages/api/src/__tests__/tenant-theme-isolation.test.ts,packages/web/src/platform/theme/__tests__/ThemeProvider.test.tsx,design-parity-focused-web-20260511,design-parity-api-settings-20260511

Proposed guidance: When supporting tenant accent overrides, store accentColor in tenant settings, validate hex or empty deletion at the API boundary, apply --color-accent and --color-accent-light only on tenant-scoped wrappers and body portal scope, and remove those variables on unmount/clear so pre-tenant chrome remains neutral.

Files:
- packages/web/src/platform/theme/ThemeProvider.tsx
- packages/web/src/lib/theme.ts
- packages/web/src/apps/ordering/merchant/ThemeSettings.tsx
- packages/api/src/routes/tenant-settings.ts
- .codex/knowledge/design-system.md

Notes: n/a

Promotion rule: keep this as evidence until review accepts it for durable guidance.
