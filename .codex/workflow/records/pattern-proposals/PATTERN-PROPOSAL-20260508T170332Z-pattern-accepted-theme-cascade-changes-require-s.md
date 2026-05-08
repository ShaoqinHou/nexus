---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260508T170332Z-pattern-accepted-theme-cascade-changes-require-s"
created: "2026-05-08T17:03:32.769Z"
status: "accepted"
reporter: "codex"
evidence: "Historical commit c4a438e12f9; ThemeProvider.tsx body mirror and initialThemeId sync; theme CSS descendant dark selectors; TEST-20260508T170320Z-historical-hard-case-routing-analysis-c4a438e."
files: ["packages/web/src/platform/theme/ThemeProvider.tsx","packages/web/src/platform/theme/themes.css","packages/web/src/platform/theme/themes/izakaya.css","packages/web/src/apps/ordering/merchant/ThemeSettings.tsx"]
---

# Pattern accepted Theme cascade changes require strong-model review and portal evidence

Status: accepted
Reporter: codex

Summary: Theme cascade changes require strong-model review and portal evidence

Evidence: Historical commit c4a438e12f9; ThemeProvider.tsx body mirror and initialThemeId sync; theme CSS descendant dark selectors; TEST-20260508T170320Z-historical-hard-case-routing-analysis-c4a438e.

Proposed guidance: For cuisine theme cascade changes, verify .dark descendant selectors, no .light-only inversion, tenant wrapper/body portal mirroring and cleanup, and live-preview prop sync. Route this class to a strong model/reviewer, not Spark.

Files:
- packages/web/src/platform/theme/ThemeProvider.tsx
- packages/web/src/platform/theme/themes.css
- packages/web/src/platform/theme/themes/izakaya.css
- packages/web/src/apps/ordering/merchant/ThemeSettings.tsx

Notes: n/a

Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.
