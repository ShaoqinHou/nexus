# Standards Registry

Last generated: 2026-04-19

Source of truth for audit agents. Each standard includes a Detection recipe usable with Grep.
The Reviewer agent cites these by ID (e.g. `rule: standards.md § S-TENANT-ISOLATION`).

Cross-references:
- Rule docs: `.claude/rules/*.md`
- Enforcement hook: `.claude/hooks/check-edited-file.sh`
- Review loop: `.claude/skills/commit-review/SKILL.md`

---

## S-TENANT-ISOLATION
Source: .claude/rules/architecture.md, CLAUDE.md
Rule: Every DB query against a tenant-scoped table MUST filter by `tenantId`. Missing filter = cross-tenant data leak. Exception: platform-level routes under `/api/platform/*` (tenants CRUD, health).
Detection: grep `db\.select\(\)\.from\(|db\.insert\(|db\.update\(|db\.delete\(` inside `packages/api/src/modules/` — every matched chain MUST include `eq(<table>.tenantId, tenantId)` in its `where` clause within 5 lines.
Severity: critical

---

## S-TENANT-MIDDLEWARE
Source: .claude/rules/architecture.md
Rule: Every route mounted under `/api/t/:tenantSlug/*` MUST receive the tenant from middleware (`c.var.tenant`), never from route params directly. The tenant middleware validates existence and sets `c.var.tenant` / `c.var.tenantId`. Customer-facing routes under `/api/order/:tenantSlug/*` use the same pattern.
Detection: grep `c\.req\.param\(['\"]tenantSlug` inside `packages/api/src/modules/` — direct slug reads bypass middleware validation.
Severity: critical

---

## S-SERVICE-PURE-PARAMS
Source: .claude/rules/architecture.md
Rule: Service-layer functions receive typed params (db, tenantId, …). They MUST NOT accept a Hono `Context` or access `c.req` / `c.var`. Decoupling keeps services testable and composable.
Detection: grep `c:\s*Context|c\.req|c\.var|c\.json` inside `packages/api/src/modules/*/service.ts`.
Severity: critical

---

## S-MODULE-3-FILES
Source: .claude/rules/architecture.md, .claude/rules/import-boundaries.md
Rule: Every backend module in `packages/api/src/modules/{name}/` contains exactly three canonical files: `routes.ts`, `service.ts`, `schema.ts`. Tests go in `__tests__/`. No other top-level files (no `utils.ts`, `helpers.ts` — extract to `packages/api/src/lib/` if shared, inline if not).
Detection: `ls packages/api/src/modules/{name}/` should show routes.ts + service.ts + schema.ts + optional __tests__/ only.
Severity: high

---

## S-ROUTES-DELEGATE
Source: .claude/rules/architecture.md
Rule: `routes.ts` contains HTTP handling + Zod validation ONLY. Business logic and DB access MUST live in `service.ts`. Routes call services; services call the DB.
Detection: grep `db\.select|db\.insert|db\.update|db\.delete` inside `packages/api/src/modules/*/routes.ts` — any hit is a layer-skip violation.
Severity: high

---

## S-ZOD-VALIDATION
Source: .claude/rules/tech-conventions.md
Rule: Every route that accepts input (body, query, params) MUST validate with a Zod schema before passing to services. Never trust the client.
Detection: grep `c\.req\.json\(\)|c\.req\.query\(\)|c\.req\.param\(` inside `packages/api/src/modules/*/routes.ts` without an accompanying `zValidator(` or `.parse(` / `.safeParse(` within 10 lines.
Severity: high

---

## S-ERROR-SHAPE
Source: .claude/rules/tech-conventions.md
Rule: Error responses follow `{ error: string, code?: string }`. No bare strings, no varying shapes per endpoint. HTTP status codes used semantically (400 validation, 401 auth, 403 tenant-mismatch, 404, 409 conflict, 500 server).
Detection: grep `c\.json\(\s*['\"]` inside `packages/api/src/modules/*/routes.ts` — bare-string error responses are violations. grep `c\.json\(\s*{\s*(message|msg)` — alternative error keys are violations.
Severity: medium

---

## S-IMPORT-BOUNDARIES-APPS
Source: .claude/rules/import-boundaries.md
Rule: Frontend apps cannot import from other apps. `apps/{a}/` MUST NOT import from `apps/{b}/`. Shared logic lives in `components/`, `platform/`, or `lib/`.
Detection: grep `from.*['\"].*apps/` inside `packages/web/src/apps/{name}/` — any import path containing a different `apps/{other}/` segment is a violation.
Severity: critical (hook enforced via .claude/hooks/check-edited-file.sh)

---

## S-IMPORT-BOUNDARIES-MODULES
Source: .claude/rules/import-boundaries.md
Rule: Backend modules cannot import from other modules. `modules/{a}/` MUST NOT import from `modules/{b}/`. Shared business logic lives in `packages/api/src/lib/`.
Detection: grep `from.*['\"].*modules/` inside `packages/api/src/modules/{name}/` — any import path containing a different `modules/{other}/` segment is a violation.
Severity: critical (hook enforced)

---

## S-IMPORT-BOUNDARIES-UI
Source: .claude/rules/import-boundaries.md
Rule: `components/ui/` primitives are stateless, domain-free. They MUST NOT import from `apps/` or `platform/`. They MAY import from `lib/`. `components/patterns/` may import from `components/ui/` and `lib/` but not from `apps/` or `platform/`.
Detection: grep `from.*['\"].*(apps/|platform/)` inside `packages/web/src/components/ui/` and `packages/web/src/components/patterns/`.
Severity: critical (hook enforced)

---

## S-IMPORT-ALIASES
Source: .claude/rules/import-boundaries.md, .claude/rules/tech-conventions.md
Rule: Use `@web` / `@api` / `@nexus/shared` import aliases, never relative paths that cross package boundaries or traverse more than 2 levels up (`../../..`).
Detection: grep `from\s+['\"]\.\./\.\./\.\./` inside `packages/web/src/` and `packages/api/src/`.
Severity: medium

---

## S-NO-HARDCODE-COLORS
Source: .claude/rules/design-system.md, .claude/rules/tech-conventions.md
Rule: Never hardcode colors. Use token-backed Tailwind classes (`bg-brand`, `text-text`, `bg-bg-surface`) or CSS custom property references (`var(--color-*)`, `var(--color-brand)`). No raw hex, no rgba literals, no default Tailwind color scales (`bg-gray-*`, `text-red-*`) for anything that will be re-themed per-tenant.
Detection:
  - grep pattern `#[0-9a-fA-F]{3,8}` inside `packages/web/src/**/*.tsx` (excluding `__tests__`)
  - grep `(bg|text|border)-(gray|slate|zinc|red|green|blue|yellow|orange|purple|pink|amber)-[0-9]` in `apps/` and `components/` files
  - grep `style=\{[^}]*(#|rgba?\()` for inline color styles
Severity: high (hook enforced — partial coverage)

---

## S-NO-HARDCODE-PIXELS
Source: .claude/rules/design-system.md
Rule: Use Tailwind's spacing scale (`p-4`, `gap-3`, `h-12`). Raw `Npx` values are forbidden outside Tailwind arbitrary value brackets (`min-h-[48px]` is OK; `style={{ padding: '12px' }}` is not).
Detection: grep `\b[0-9]+px\b` inside `packages/web/src/**/*.tsx` excluding lines containing `\[[^]]*px` (arbitrary-value bracket) and excluding `__tests__/`.
Severity: high (hook enforced)

---

## S-TOUCH-TARGET-48
Source: .claude/rules/design-system.md, WCAG 2.1 AA
Rule: Interactive elements (`<button>`, clickable `<div onClick=…>`, anchor-as-button) MUST have a minimum 48×48px touch target. Use `min-h-[48px]` or `h-12+` plus sufficient width. Icon-only buttons need `w-12` minimum.
Detection: grep `<button|<div[^>]*onClick|<a[^>]*onClick` inside `packages/web/src/**/*.tsx` without `min-h-\[4[89]|min-h-\[[5-9][0-9]|h-1[2-9]|h-[2-9][0-9]|h-full|p-[3-9]` on the same line or its 2 surrounding lines.
Severity: high (hook enforced — heuristic)

---

## S-SEMANTIC-TOKENS
Source: .claude/rules/design-system.md
Rule: Use semantic tokens (`text-text`, `text-text-secondary`, `bg-bg-surface`, `bg-bg-muted`, `border-border`, `bg-success`, `text-danger`) instead of raw color utilities. This guarantees dark-mode support and per-tenant theming.
Detection: grep `(text|bg|border)-(gray|slate|zinc|red|green|blue|yellow|orange|purple|pink)-[0-9]` inside `packages/web/src/apps/` and `packages/web/src/components/` — presence without a semantic-token alternative on the same element is a drift.
Severity: medium

---

## S-DARK-MODE
Source: .claude/rules/design-system.md
Rule: Every component MUST work in dark mode. Achieved automatically by using semantic tokens (`.dark` class on root swaps tokens). NEVER use `dark:` Tailwind variants that duplicate token logic — if you're writing `dark:bg-gray-900`, the token system is being bypassed.
Detection: grep `dark:(bg|text|border)-` inside `packages/web/src/apps/` and `packages/web/src/components/` — any hit indicates token bypass.
Severity: medium

---

## S-I18N-MANDATORY
Source: .claude/rules/tech-conventions.md, CLAUDE.md § i18n
Rule: ALL user-visible strings in JSX, button labels, placeholders, aria-labels, toast messages, error messages, empty states, and select options MUST be wrapped in `t()`. Call `const t = useT()` at the top of each component. Dynamic DB content (menu item names) is translated at save time via GLM and served via `?lang=` — do NOT wrap DB content in `t()`.
Detection:
  - grep `>\s*[A-Z][a-zA-Z ]+\s*<` inside `packages/web/src/apps/` and `packages/web/src/components/` (static JSX text)
  - grep `(placeholder|aria-label|title|alt)=['\"][A-Z][a-zA-Z ]` in `.tsx` files (untranslated attributes)
  - scripts/i18n-audit.js produces per-file violation reports; hook surfaces them
Severity: high (hook enforced via scripts/i18n-audit.js)

---

## S-I18N-5-LOCALES
Source: .claude/rules/tech-conventions.md
Rule: Every new string key MUST be added to all 5 locale files: `en.json`, `zh.json`, `ja.json`, `ko.json`, `fr.json`. English strings ARE the keys: `t('Place Order')` not `t('order.place')`.
Detection: after a commit adds keys to `en.json`, grep the other 4 locale files for missing keys. Script: `node .claude/workflow/add-i18n-keys.js --verify`.
Severity: high

---

## S-I18N-SHARED-CONSTANTS
Source: .claude/rules/tech-conventions.md
Rule: Shared constants (`ORDER_STATUS_LABELS`, `DIETARY_TAGS`, `ALLERGENS`, `STAFF_ROLES`) MUST wrap their rendered values in `t()` AT THE RENDER SITE, not in the constant definition. Constants stay as pure data.
Detection: grep `ORDER_STATUS_LABELS|DIETARY_TAGS|ALLERGENS|STAFF_ROLES` inside `packages/web/src/` — rendered values must be inside `t(...)`.
Severity: medium

---

## S-TANSTACK-QUERY
Source: .claude/rules/tech-conventions.md
Rule: All server state uses TanStack Query (`useQuery`, `useMutation`). No `useEffect` + `fetch` for data fetching. No direct `fetch()` in components — go through a hook in `apps/{name}/hooks/`.
Detection:
  - grep `useEffect\([^)]*fetch\(` inside `packages/web/src/`
  - grep `\bfetch\(` inside `packages/web/src/apps/*/merchant/` and `packages/web/src/apps/*/customer/` (component files)
Severity: high

---

## S-QUERY-KEY-FACTORY
Source: .claude/rules/tech-conventions.md
Rule: Every app module with server state has a query-key factory at `apps/{name}/hooks/keys.ts` exporting a `{name}Keys` object (e.g. `orderingKeys.menu(tenantId)`, `orderingKeys.orders(tenantId, filters)`). No inline string query keys (`['menu', tenantId]`).
Detection: grep `useQuery\(\s*\{\s*queryKey:\s*\[` in `.tsx` files — inline array literals without the `{name}Keys.*` helper are violations.
Severity: medium

---

## S-MUTATION-TOAST-FEEDBACK
Source: .claude/rules/tech-conventions.md
Rule: Every `useMutation` MUST wire `onSuccess` and `onError` to the toast system (`useToast()`). Silent mutations leave users unsure whether actions landed.
Detection: grep `useMutation\(` inside `.tsx` files and verify the options object includes `onSuccess` or `onError` with a `toast.*` call.
Severity: medium

---

## S-DRIZZLE-ONLY
Source: .claude/rules/tech-conventions.md
Rule: All DB access via Drizzle ORM. No raw SQL (`db.run(sql\`…\`)`, `db.all('SELECT …')`). Use `eq()`, `and()`, `or()` from drizzle-orm.
Detection: grep `db\.run\(|db\.all\(['\"]|db\.get\(['\"]|sql\`SELECT|sql\`INSERT|sql\`UPDATE|sql\`DELETE` inside `packages/api/src/`.
Severity: high

---

## S-NANOID-IDS
Source: .claude/rules/tech-conventions.md
Rule: Generated IDs use `nanoid()`. No `Math.random()`-based IDs, no timestamp-based IDs, no UUID v4 (nanoid is our canonical short-ID format).
Detection:
  - grep `Math\.random\(\).*toString|Date\.now\(\).*toString` in service and schema files
  - grep `crypto\.randomUUID\(|uuid\(` in service files
Severity: medium

---

## S-ISO-TIMESTAMPS
Source: .claude/rules/tech-conventions.md
Rule: Timestamps stored as ISO 8601 strings (`new Date().toISOString()`). No unix epochs, no `Date.now()` integers, no custom formats.
Detection: grep `Date\.now\(\)` and `new Date\(\)\.getTime\(\)` inside `packages/api/src/modules/*/service.ts` and `schema.ts`.
Severity: medium

---

## S-NAMED-EXPORTS
Source: .claude/rules/tech-conventions.md
Rule: Named exports only. No default exports anywhere in `packages/`.
Detection: grep `^export default` inside `packages/api/src/` and `packages/web/src/`.
Severity: high

---

## S-NO-ANY
Source: .claude/rules/tech-conventions.md
Rule: TypeScript strict mode, no `any`. Use `unknown` + type narrowing. No `as any`. Exception: `@ts-expect-error` with a comment is acceptable for genuinely awkward third-party types, `@ts-nocheck` is never acceptable.
Detection: grep `:\s*any\b|as\s+any\b` inside `packages/api/src/` and `packages/web/src/` (excluding `.d.ts` and `__tests__/`).
Severity: high

---

## S-ESM-ONLY
Source: .claude/rules/tech-conventions.md
Rule: ESM only — `import` / `export`. No `require()`. Both packages have `"type": "module"` in package.json.
Detection: grep `\brequire\(` inside `packages/api/src/` and `packages/web/src/`.
Severity: high

---

## S-INTERFACE-OVER-TYPE
Source: .claude/rules/tech-conventions.md
Rule: Prefer `interface` over `type` for object shapes (extends better, error messages are clearer). `type` is reserved for unions, intersections, mapped types, and primitives.
Detection: grep `^type\s+\w+\s*=\s*\{` in `.ts`/`.tsx` — plain object-type aliases should be interfaces.
Severity: low

---

## S-APP-REGISTRATION
Source: .claude/rules/architecture.md
Rule: Every frontend mini-app exports a `MiniAppDefinition` from `apps/{name}/index.ts` (routes, nav items, permissions). The platform shell reads the registry. App routes are lazy-loaded via `React.lazy(() => import(…))`.
Detection: every directory in `packages/web/src/apps/` must contain `index.ts` exporting `MiniAppDefinition`. grep `export const \w+App\s*:\s*MiniAppDefinition`.
Severity: high

---

## S-LAZY-ROUTES
Source: .claude/rules/architecture.md
Rule: App route components are lazy-loaded, not eagerly imported from `index.ts`. Keeps the platform shell bundle small.
Detection: grep `import\s+\{[^}]*Page\b` inside `packages/web/src/apps/*/index.ts` — eagerly imported page components are violations. Use `React.lazy()` or TanStack Router's lazy loader.
Severity: medium

---

## S-SHARED-UI-PRIMITIVES
Source: .claude/rules/design-system.md
Rule: Check `components/ui/` before inlining a button/card/dialog/badge/input/toggle/select. Use `<Button variant="primary">`, `<Dialog>`, `<ConfirmButton>` — never `<button className="rounded bg-blue-500…">`.
Detection: grep `<button\s+className=` inside `packages/web/src/apps/` — inline button markup should use `<Button>`. Similarly `<div.*role=['\"]dialog` (use `<Dialog>`), `<input className=` (use `<Input>`).
Severity: medium

---

## S-CONFIRM-DESTRUCTIVE
Source: .claude/rules/design-system.md
Rule: Destructive actions (delete, cancel-order, remove-staff, mark-unavailable-permanent) MUST use `<ConfirmButton>` (two-click, 3s auto-reset). Never a bare `<Button variant="destructive">` on a delete.
Detection: grep `onClick=\{[^}]*(delete|remove|cancel|discard)` near a `<Button` without `ConfirmButton` in the same file — manual review flag.
Severity: high

---

## S-TESTS-L1
Source: .claude/rules/testing.md
Rule: Layer 1 (Unit) tests required for every service function that touches the DB or contains business logic. Located in `packages/api/src/modules/{name}/__tests__/{Name}.test.ts`. Test concrete inputs + outputs, edge cases, and TENANT ISOLATION (tenant A's data invisible to tenant B).
Detection: every `service.ts` in `modules/*/` must have a corresponding `__tests__/{Name}.test.ts` that imports from it.
Severity: high

---

## S-TESTS-L2
Source: .claude/rules/testing.md
Rule: Layer 2 (Integration) tests wire route→service→DB. Required for any route change. Located in `packages/api/src/modules/{name}/__tests__/{Route}.integration.test.ts` or similar.
Detection: every `routes.ts` with non-trivial handlers should have an integration test exercising at least one happy path + one error path per route.
Severity: medium

---

## S-TESTS-L3
Source: .claude/rules/testing.md
Rule: Layer 3 (Behavioral E2E) tests use chrome-devtools MCP (`/verify` skill). Required for any user-facing feature — new pages, CRUD flows, multi-step workflows. "Visible in snapshot" does NOT equal "working" — test the interaction.
Detection: new routes in `apps/{name}/merchant/` or `apps/{name}/customer/` without a documented `/verify` run in the commit message or PR.
Severity: medium

---

## S-TESTS-L4
Source: .claude/rules/testing.md
Rule: Layer 4 (Output verification) for artifact producers: receipts, QR codes, file exports, reports. Verify the generated content, not just that the button was clicked.
Detection: features with artifact output (grep `generateQR|exportCSV|downloadPDF|printReceipt`) without corresponding output-assertion tests.
Severity: medium

---

## S-CONCRETE-ASSERTIONS
Source: .claude/rules/testing.md
Rule: Tests use concrete assertions: `expect(total).toBe(33.00)` not `expect(total).toBeGreaterThan(0)`. `expect(order).toEqual({ id: 'abc', status: 'pending', items: [...] })` not `expect(order).toBeDefined()`. Assert both what changed AND what didn't.
Detection: grep `toBeDefined\(\)|toBeTruthy\(\)|toBeGreaterThan\(0\)|toBeLessThan\(\s*(Infinity|99999)` inside `packages/**/__tests__/*.test.ts`.
Severity: high

---

## S-TENANT-ISOLATION-TEST
Source: .claude/rules/testing.md
Rule: Every module MUST have at least one test verifying cross-tenant isolation. Seed two tenants, insert data for tenant A, query as tenant B, assert empty result. Without this test the tenant-filter could silently drop and no one would notice.
Detection: grep `tenantA|tenantB|tenant_a|tenant_b|twoTenants` inside `packages/api/src/modules/*/__tests__/` — at least one match per module.
Severity: high

---

## S-REACT-FUNCTIONAL
Source: .claude/rules/tech-conventions.md
Rule: React 19, functional components only. No class components. No `useEffect` for data fetching — use TanStack Query. No `any` in event handlers — type them (`React.MouseEvent<HTMLButtonElement>`).
Detection:
  - grep `class\s+\w+\s+extends\s+(React\.)?(Component|PureComponent)` inside `packages/web/src/`
  - grep `\(e:\s*any\)|\(event:\s*any\)` in event handlers
Severity: medium

---

## S-CART-SESSION-STORAGE
Source: .claude/rules/architecture.md
Rule: Customer cart state (ordering module) is client-side via `CartProvider` (useReducer + sessionStorage). NOT server-side, NOT localStorage (persistence beyond the order is wrong). Cleared after order placement.
Detection: grep `localStorage` inside `packages/web/src/apps/ordering/customer/` — should be `sessionStorage` via CartProvider only.
Severity: medium

---

## S-AUTH-CONTEXT-SINGLE
Source: .claude/rules/architecture.md
Rule: Auth state (staff JWT) lives in `AuthProvider` only. Tenant context in `TenantProvider` only. No duplicate auth reads from localStorage in components — use `useAuth()` / `useTenant()` hooks.
Detection: grep `localStorage\.getItem\(['\"]*(token|jwt|auth|tenant)` inside `packages/web/src/apps/` and `packages/web/src/components/` — platform providers are the only allowed consumer.
Severity: high

---

## S-SCHEMA-TENANT-FK
Source: .claude/rules/architecture.md
Rule: Every business table in `packages/api/src/modules/*/schema.ts` and `packages/api/src/db/schema.ts` MUST have a `tenantId` column with a foreign-key reference to `tenants.id`. Exception: the `tenants` table itself and platform-level tables (`staff`, `customer_sessions` — but staff/sessions still reference tenantId).
Detection: every `sqliteTable(` in schema files must include a `tenantId: text('tenant_id').notNull().references(() => tenants.id)` line.
Severity: critical

---

## S-SOFT-DELETE
Source: .claude/rules/architecture.md
Rule: Soft deletes via `is_active` boolean column, never hard `DELETE` for business entities (menu items, staff, promos). Hard delete only for sessions and throwaway join rows.
Detection: grep `db\.delete\(` inside `packages/api/src/modules/*/service.ts` — hard deletes on business tables are violations.
Severity: medium

---

## S-ORDER-ITEM-SNAPSHOT
Source: .claude/rules/architecture.md
Rule: Order items snapshot name + price + modifier choices at order creation time. Later price/name changes on menu items MUST NOT affect historical orders. Enforced at service layer in `createOrder`.
Detection: grep `createOrder|placeOrder` in `packages/api/src/modules/ordering/service.ts` and verify item creation copies `name`, `price`, `modifiers` into the order-item row rather than storing only `menu_item_id`.
Severity: high

---

## S-WINDOWS-ENV
Source: .claude/rules/tech-conventions.md, CLAUDE.md
Rule: Windows MINGW64 environment. Use `python` not `python3`. Forward slashes in paths. `node -e` for JSON parsing (jq may not be available). `MSYS_NO_PATHCONV=1` before commands with `--base /path/`.
Detection: grep `python3\b` inside `.claude/hooks/*.sh` and shell scripts.
Severity: medium

---

## S-GIT-CONVENTIONS
Source: .claude/rules/tech-conventions.md
Rule: Branch naming: `feat/{module}-{description}`, `fix/{module}-{description}`. Commit messages imperative mood, reference module: `feat(ordering): add menu CRUD`. One feature per branch, one concern per commit.
Detection: review branch names and commit subject lines.
Severity: low

---

## S-NO-CONSOLE-LOG
Source: .claude/rules/tech-conventions.md
Rule: No `console.log` in committed code. Use structured logging or remove. `console.error` is acceptable for genuinely unrecoverable errors with actionable messages.
Detection: grep `console\.log\(` inside `packages/api/src/` and `packages/web/src/` (excluding `__tests__/` and `scripts/`).
Severity: low
