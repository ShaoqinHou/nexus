---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260511T015357Z-pattern-proposed-primary-colored-surfaces-need-a"
created: "2026-05-11T01:53:57.310Z"
status: "proposed"
reporter: "codex"
reviewer: ""
evidence: "Final design audit found Izakaya and other cuisine primary fills could pair poorly with --color-text-inverse; implemented --color-primary-text in tokens, theme overrides, ThemeProvider tenant brand overrides, and design-token contrast lint."
files: ["packages/web/src/platform/theme/tokens.css","packages/web/src/platform/theme/themes/izakaya.css","packages/web/src/platform/theme/ThemeProvider.tsx",".codex/scripts/check-design-tokens.mjs"]
---

# Pattern proposed Primary-colored surfaces need a dedicated primary text token

Status: proposed
Reporter: codex



Summary: Primary-colored surfaces need a dedicated primary text token

Evidence: Final design audit found Izakaya and other cuisine primary fills could pair poorly with --color-text-inverse; implemented --color-primary-text in tokens, theme overrides, ThemeProvider tenant brand overrides, and design-token contrast lint.

Proposed guidance: Use --color-primary-text or text-primary-text on bg-primary / var(--color-primary) surfaces. Keep --color-text-inverse for non-primary semantic fills unless a component has explicit proof.

Files:
- packages/web/src/platform/theme/tokens.css
- packages/web/src/platform/theme/themes/izakaya.css
- packages/web/src/platform/theme/ThemeProvider.tsx
- .codex/scripts/check-design-tokens.mjs

Notes: n/a

Promotion rule: keep this as evidence until review accepts it for durable guidance.
