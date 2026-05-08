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

---

# Design-System Standards (Claude Design handoff)

These standards govern the design-system infrastructure imported from the Claude Design
bundle in `design/reference/v1/`. They compose with the existing colour/pixel/token rules
above.

---

## S-DESIGN-REFERENCE
Source: .claude/rules/design-system.md, Claude Design handoff README
Rule: `design/reference/v<N>/` holds a Claude Design export verbatim as a read-only baseline. It is the source-of-truth SPEC, not a runtime library. Never import from it in production code; never edit its contents. When a new export arrives, save as the next version (`v2/`, `v3/`) and `git diff` structurally to plan updates. The bundle's own README (`design/reference/v1/nexus-design-system/README.md`) enumerates the design invariants and must be consulted before any visual change.
Detection:
  - any edit to files under `design/reference/v<N>/*` (excluding new version folders) — flag as violation.
  - any `import` or `@import` pointing at `design/reference/` inside `packages/*/src/` — flag.
Severity: high

---

## S-REGISTRY-ENTRY
Source: .claude/rules/design-system.md
Rule: Every file in `packages/web/src/components/ui/*.tsx` and `packages/web/src/components/patterns/*.tsx` (excluding `index.ts`, `__tests__/`) MUST have a corresponding entry in `packages/web/src/components/registry.json` listing `{ name, path, kind: "ui" | "pattern", purpose, propsShape, tokensUsed, dependencies, zooRoute }`. The registry is the machine-readable index agents read before inventing new components.
Detection:
  - list `packages/web/src/components/ui/*.tsx` and `packages/web/src/components/patterns/*.tsx` (strip `index.ts` and `__tests__`).
  - read `packages/web/src/components/registry.json`.
  - every component filename basename must appear as a registry entry with a matching `path`. Missing entries are violations; orphan entries (registry has it, filesystem doesn't) are also violations.
Severity: medium

---

## S-ZOO-PAGE
Source: .claude/rules/design-system.md
Rule: Every primitive and pattern component has a zoo page at `packages/web/src/routes/__design/<name>.tsx` that imports from the real component and renders each variant in isolation. The zoo is a reflection of source, not a duplicate — it imports, never copies. Zoo routes are dev-only: mounted under `/design/*` only when `import.meta.env.DEV`, code-split so nothing lands in the production bundle.
Detection:
  - for each registry.json entry, verify `packages/web/src/routes/__design/<name>.tsx` exists.
  - grep the zoo file for an import from the real component path listed in the registry — a zoo page that redefines the component inline (rather than importing) is a violation.
  - grep the route wiring for an `import.meta.env.DEV` guard or a dedicated dev-only lazy loader — zoo routes that ship to prod are violations.
Severity: medium

---

## S-HIT-TARGET-TOKEN
Source: .claude/rules/design-system.md, Claude Design bundle § VISUAL FOUNDATIONS
Rule: Interactive elements use `--hit-sm` (44px), `--hit-md` (48px), or `--hit-lg` (52px) token-based sizing. Tailwind arbitrary pixel values (`h-[44px]`, `min-h-[48px]`) are legacy — replace with token references via `h-[var(--hit-md)]` OR semantic size props on `<Button size="md">`. This supersedes S-TOUCH-TARGET-48 whenever a primitive is available. 44×44px remains the floor — customer quantity steppers use 48×48px minimum (`size="md"`).
Detection: grep `min-h-\[(4[89]|5[0-9])px\]|h-\[(4[89]|5[0-9])px\]` inside `packages/web/src/apps/` and `packages/web/src/components/` — hardcoded touch-target pixels that could be token references are flagged.
Severity: medium

---

## S-LUCIDE-ONLY
Source: .claude/rules/design-system.md, Claude Design bundle § ICONOGRAPHY
Rule: Utility/UI icons come from `lucide-react` stroke-based outlines only — no filled variants. Default size `h-5 w-5` (20px) for nav, `h-4 w-4` for button-inline, `h-6 w-6` for dialog close, `h-8 w-8` for EmptyState circles. Emoji and unicode glyphs are FORBIDDEN as icons (they render differently per OS and break i18n). The single sanctioned unicode exception is ` · ` (middle dot U+00B7) used once on the customer hero between two short status fragments.
Detection:
  - grep for common unicode-as-icon patterns in JSX text: `→|←|↑|↓|✓|✗|★|☆|●|○|▸|◂|⚠|⓵|①` inside `packages/web/src/apps/` and `packages/web/src/components/`.
  - grep `[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]` (emoji + misc-symbols block) in `.tsx` files under the same paths. Locale JSON files are exempt (translated user content).
  - `lucide-react` is the ONLY icon-library import permitted in `apps/`/`components/`. Any other icon library (`react-icons`, `heroicons`, `phosphor-react`, `@heroicons/react`) is a violation.
Severity: medium

---

## S-DIETARY-SPRITE
Source: .claude/rules/design-system.md, Claude Design bundle § ICONOGRAPHY
Rule: Dietary markers (vegetarian, vegan, gluten-free, halal, kosher, nut-free, dairy-free, shellfish), spice-level indicators, and promo badges MUST reference the custom sprite at `packages/web/src/assets/dietary-icons.svg` via a `<DietaryIcon name="vegetarian">` primitive (which wraps `<svg><use href="/dietary-icons.svg#<name>" /></svg>`). Emoji, unicode glyphs, and per-tag inline SVGs are forbidden.
Detection:
  - grep food/dietary emoji (`🌱|🌿|🥩|🥜|🌶|🥛|🦐|🍤|🔥|🌾|🥗|🥖|🍗|🥛`) inside `packages/web/src/apps/ordering/`.
  - grep `DIETARY_TAGS|DIETARY_LABELS` render sites — every one must render a `<DietaryIcon>` component or a `<use href="...dietary-icons...">`, not a text-only label or emoji.
Severity: medium

---

## S-THEMED-COMPONENT
Source: .claude/rules/design-system.md, Claude Design bundle § THEMES
Rule: Themes are applied via `data-theme="<id>"` on a wrapper element, not JS re-renders. The 10 canonical theme IDs are: `classic`, `trattoria`, `izakaya`, `bubble-tea`, `counter`, `taqueria`, `curry-house`, `sichuan`, `cantonese`, `wok`. **Both customer AND merchant chrome re-skin when `data-theme` flips** — they share the same `ThemeProvider` wrapper component. The customer shell pins the cuisine theme via `<ThemeProvider initialThemeId={tenantTheme} scope="customer">` (in `CustomerShell`); the merchant chrome pins it via `<ThemeProvider initialThemeId={tenantTheme} scope="merchant">` (in `routeTree.MerchantThemeShell`). The merchant `Settings` page (`/t/<slug>/ordering/settings`) is the single source of truth: editing the cuisine theme there live-previews on the merchant chrome itself — no separate preview pane needed since the staff member is looking at the result directly.

**Per-cuisine token surface (matches the bundle's design canvas):**
- *Surface* — `--color-bg`, `--color-bg-surface`, `--color-bg-muted`, `--color-bg-elevated`, `--color-bg-strong`. Each cuisine has its own surface story (rice paper for sichuan, lacquer for izakaya, washi for trattoria, etc).
- *Brand* — `--color-brand`, `--color-brand-hover`, `--color-brand-light`, `--color-primary`, `--color-primary-hover`, `--color-primary-light`. Cuisine default + per-tenant override layered on the wrapper inline style.
- *Accent* — `--color-accent`, `--color-accent-light`. Per-cuisine non-semantic highlight (matcha, gold, olive, vermillion). Used for promo overlays, badges that aren't semantic.
- *Semantic* — `--color-success`, `--color-warning`, `--color-danger`, `--color-info` and their `-light` variants. **Re-themed per cuisine to fit the cuisine's palette** (sichuan success=bamboo green, trattoria success=basil, bubble-tea danger=strawberry, counter info=ink black). The bundle deliberately does this so the entire UI feels cohesive — not just brand colour. Universal recognition (success ≈ green-ish, danger ≈ red-ish) is preserved by hue family, not exact hex.
- *Typography* — `--font-sans`, `--font-display`, `--font-mono`, plus `--font-display-weight` and `--font-display-tracking`. Display font is the cuisine identity (Fraunces serif for trattoria, Noto Serif SC for sichuan/cantonese, JetBrains Mono for izakaya/counter).
- *Shape* — `--radius-card`, `--radius-btn`, `--radius-chip` (semantic shape tokens). Counter sets all to 0px (sharp brutalist), trattoria/taqueria/curry-house/bubble-tea set btn+chip to `--radius-full` (pill), classic stays medium-rounded. **UI primitives MUST use these tokens, NOT hardcoded `rounded-md`/`rounded-full` Tailwind classes.**
- *Shadow* — `--shadow-sm/md/lg` per-cuisine alpha-tinted (warm browns for trattoria/sichuan, cold blacks for counter, dramatic deep blacks for izakaya).

Detection:
  - grep `data-theme=` in `packages/web/src/` — values must be one of the 10 canonical IDs.
  - grep for per-theme JS overrides (`if (theme === 'sichuan') style = { ... }`) — theme logic belongs in CSS, not JS.
  - grep `rounded-(md|lg|xl|full)\b` inside `packages/web/src/components/ui/` — UI primitives must use the semantic shape tokens (`rounded-[var(--radius-btn)]`, `rounded-[var(--radius-card)]`, `rounded-[var(--radius-chip)]`), not hardcoded radius utilities. Hardcoded shape utilities flatten cuisine identity.
  - The outer `ThemeProvider` in `main.tsx` (no `initialThemeId`) MUST NOT set `data-theme` on `<html>` — pre-tenant routes (login, tenant picker) stay neutral. All cuisine theming happens via tenant-scoped wrapper divs.
  - The merchant chrome wrapper must use `<ThemeProvider scope="merchant" initialThemeId={...}>` — the `MerchantThemeShell` in `routeTree.tsx` is the canonical site.
  - Cuisine PREVIEW cards in `ThemeSettings.CuisineThemeCard` MUST be wrapped in `<div data-theme={target.id}>` and use `var(--font-display)` / `var(--radius-*)` so each preview renders in its target cuisine's tokens, not the active console theme's. Otherwise all 10 cards look identical except for the swatch row.
Severity: medium
