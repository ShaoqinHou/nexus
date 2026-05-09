---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260509T110401Z-pattern-proposed-pattern-accepted-design-zoo-mus"
created: "2026-05-09T11:04:01.652Z"
status: "proposed"
reporter: "codex"
reviewer: ""
evidence: "packages/web/src/routes/__design/Zoo.tsx; .codex/scripts/validate-design-zoo.mjs bodyTheme/zooThemeScopeCount; npm run workflow:design-zoo"
files: ["packages/web/src/routes/__design/Zoo.tsx",".codex/scripts/validate-design-zoo.mjs",".codex/knowledge/design-system.md"]
---

# Pattern proposed pattern accepted design zoo must apply selected data-theme to showcase wrapper and body portal scope

Status: proposed
Reporter: codex



Summary: pattern accepted design zoo must apply selected data-theme to showcase wrapper and body portal scope

Evidence: packages/web/src/routes/__design/Zoo.tsx; .codex/scripts/validate-design-zoo.mjs bodyTheme/zooThemeScopeCount; npm run workflow:design-zoo

Proposed guidance: The dev-only Design Zoo/Gym is a tenant-theme test harness: the selected cuisine theme must be applied on a data-theme wrapper around demos and mirrored to document.body for body-mounted portal components. Design validation should assert both wrapper and body theme state.

Files:
- packages/web/src/routes/__design/Zoo.tsx
- .codex/scripts/validate-design-zoo.mjs
- .codex/knowledge/design-system.md

Notes: n/a

Promotion rule: keep this as evidence until review accepts it for durable guidance.
