---
schema: "nexus-pattern-proposal/v1"
id: "PATTERN-PROPOSAL-20260508T171629Z-pattern-proposed-browser-validation-locators-nee"
created: "2026-05-08T17:16:29.334Z"
status: "proposed"
reporter: "codex"
evidence: "npm run workflow:design-zoo initially failed because getByRole link name Toast also matched AddToCartToast; fixed in .codex/scripts/validate-design-zoo.mjs with exact: true; TEST-20260508T171614Z-reusable-design-zoo-validator."
files: [".codex/scripts/validate-design-zoo.mjs",".codex/workflow/records/tests/TEST-20260508T171614Z-reusable-design-zoo-validator.md"]
---

# Pattern proposed Browser validation locators need exact names when component names overlap

Status: proposed
Reporter: codex

Summary: Browser validation locators need exact names when component names overlap

Evidence: npm run workflow:design-zoo initially failed because getByRole link name Toast also matched AddToCartToast; fixed in .codex/scripts/validate-design-zoo.mjs with exact: true; TEST-20260508T171614Z-reusable-design-zoo-validator.

Proposed guidance: For zoo/dashboard browser checks, use exact accessible names or scoped locators when names are substrings of other component names.

Files:
- .codex/scripts/validate-design-zoo.mjs
- .codex/workflow/records/tests/TEST-20260508T171614Z-reusable-design-zoo-validator.md

Notes: n/a

Promotion rule: keep this as evidence until review accepts it for durable guidance.
