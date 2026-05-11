# Nexus Patterns And Traps

This file captures durable project knowledge that coding and review agents should use before editing.

## Highest-Priority Invariants

- Every tenant-scoped DB query filters by `tenantId`.
- Every backend module follows `routes.ts -> service.ts -> schema.ts`.
- Routes validate and delegate; services receive typed params and do not read Hono context.
- Frontend app modules do not import from other app modules.
- `components/ui` primitives do not import from apps or platform.
- User-visible strings use `t()` and locale keys exist in `en`, `zh`, `ja`, `ko`, and `fr`.
- Server state uses TanStack Query and module query-key factories.
- Customer cart state uses `sessionStorage` through `CartProvider`, not `localStorage`.
- Business data is soft-deleted unless the table is a disposable join/session table.
- Order items snapshot name, price, and modifiers at order creation time.

## Workflow-System Patterns

- Gate and proof helper scripts must fail closed from `.codex/workflow/profile.json` and `.codex/workflow/policy/*.json`. Do not add hidden Nexus, localhost, route, theme, deployment URL, or base-path fallbacks inside helper scripts that create or validate release evidence. Evidence: `PATTERN-PROPOSAL-20260510T191819Z-pattern-proposed-workflow-helper-scripts-that-fe`.

## Design-System Traps

- Do not edit `design/reference/v<N>/`; add `v<N+1>/` for a new export.
- Do not import from `design/reference/` in production code.
- New UI primitives and patterns need a `components/registry.json` entry and a `/design/*` Zoo showcase.
- Zoo showcases are implemented in the consolidated `packages/web/src/routes/__design/Zoo.tsx` slug map, not one file per component. They import real components and must not redefine them inline.
- Use semantic shape tokens: `--radius-card`, `--radius-btn`, `--radius-chip`.
- Use hit target tokens: `--hit-sm`, `--hit-md`, `--hit-lg`.
- Use `--color-primary-text` / `text-primary-text` on primary-colour surfaces. Do not reuse `--color-text-inverse` for `bg-primary` unless a focused contrast check proves the theme and tenant-brand path still passes.
- Use Lucide for generic UI icons.
- Use `DietaryIcon` and `/dietary-icons.svg` for dietary/allergen/spice/promo markers.
- Portal content must inherit the tenant theme. `ThemeProvider` mirrors tenant theme vars onto `document.body`.
- Merchant routes, including full-screen kitchen views, must wrap in `MerchantThemeShell`.
- Subpath deploys require `import.meta.env.BASE_URL` aware route/API logic.

## How To Extend This File

Durable rules need evidence. Do not add a pattern here just because a previous prompt said it or because one local file happened to use it.

Use the dynamic discovery path:

1. Create a proposal:
   `node .codex/scripts/nexus-workflow.mjs record-pattern --summary "<finding>" --evidence "<files/tests/reviews>" --guidance "<candidate rule>"`
2. Verify the finding against source code, design references, tests, git history, or repeated review failures.
3. If accepted, add a short rule here or in another `knowledge/` file and cite the proposal or decision record.
4. If rejected or one-off, keep the proposal/review record as history without promoting it into durable guidance.

Reviewers and auditors should ask whether each new issue is a one-off defect, a repeated mistake, or evidence of an undocumented invariant.
