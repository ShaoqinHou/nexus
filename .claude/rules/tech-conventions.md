# Tech Conventions

## TypeScript
- Strict mode, no `any` type — use `unknown` + type narrowing
- Named exports only (no default exports)
- ESM only — `import`/`export`, no `require()`
- Prefer `interface` over `type` for object shapes (extends better)
- Use `satisfies` for type checking without widening

## React (packages/web)
- React 19, functional components only
- Vite + Tailwind CSS v4
- Path alias: `@web` -> `packages/web/src`
- State management: React Context for platform state, local state for UI-only state
- No `useEffect` for data fetching — use TanStack Query
- No `any` in event handlers — type them: `React.MouseEvent<HTMLButtonElement>`

## i18n (MANDATORY)
- **ALL user-visible strings MUST use `t()` — no exceptions.** This includes:
  - JSX text content, button labels, headings, placeholders, aria-labels
  - Toast messages, error messages, empty states
  - Select/dropdown option labels
  - Dietary tags, allergen names, status labels
  - Print template text (pass `t` as parameter to non-component functions)
- Import `useT` from `@web/lib/i18n`, call `const t = useT()` at top of component
- English strings are the keys: `t('Place Order')` not `t('order.place')`
- Shared constants (`ORDER_STATUS_LABELS`, `DIETARY_TAGS`, `ALLERGENS`) — wrap their values in `t()` where rendered
- Add all new strings to ALL 5 locale files: `en.json`, `zh.json`, `ja.json`, `ko.json`, `fr.json`
- Dynamic DB content (menu item names, descriptions) — translated via GLM at save time, served via `?lang=` param
- NEVER hardcode English in JSX — if you write `<p>Something</p>`, it MUST be `<p>{t('Something')}</p>`

## API (packages/api)
- Hono HTTP server
- Input validation with Zod schemas — validate ALL input, never trust the client
- Typed responses using Hono's type system
- Path alias: `@api` -> `packages/api/src`
- Every route that accesses tenant data MUST use the tenant middleware
- Error responses follow a consistent shape: `{ error: string, code?: string }`

## Data Fetching (packages/web)
- TanStack Query for all server state
- Query key factory per app module: `apps/{name}/hooks/keys.ts`
- Mutations with toast feedback (success/error)
- Optimistic updates for UX-critical mutations (add to cart, toggle availability)
- Stale time: 30s for lists, 60s for details, 0 for real-time data

## Routing (packages/web)
- TanStack Router
- Routes defined per app module in `apps/{name}/`
- Lazy loading: each app module is a lazy route chunk
- Route params typed via TanStack Router's type inference

## Database
- Drizzle ORM — no raw SQL queries
- SQLite via better-sqlite3
- Every tenant-scoped table has `tenant_id` column
- Use `eq()`, `and()`, `or()` from drizzle-orm for queries
- Timestamps: store as ISO 8601 strings
- IDs: use `nanoid()` for generated IDs

## API Conventions
- REST resource naming: `/api/modules/{module}/{resource}`
- Use plural nouns: `/orders` not `/order`
- Pagination: `?page=1&limit=20`, response `{ data, total, page, limit }`
- Filtering: query params `?status=active&category=mains`
- Sorting: `?sort=createdAt&order=desc`

## Shell Environment
- Windows MINGW64 — use forward slashes in all paths
- Use `python` not `python3`
- Use `node -e` for JSON parsing (jq may not be available)
- Prefix `MSYS_NO_PATHCONV=1` before commands with `--base /path/`

## Ports
- API: 3001
- Web: 5173

## Git Conventions
- Branch naming: `feat/{module}-{description}`, `fix/{module}-{description}`
- Commit messages: imperative mood, reference module: `feat(ordering): add menu CRUD`
- One feature per branch, one concern per commit
