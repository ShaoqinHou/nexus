---
name: new-module
description: Step-by-step guide for scaffolding a new mini-app module
user_invocable: true
---

# /new-module — Scaffold a New Mini-App Module

Use this skill when adding a new mini-app to the nexus platform.

## Step 1: Define the Module

- **Name:** snake_case module name (e.g., `ordering`, `loyalty`, `reservations`)
- **Audiences:** Who uses it? (merchant, customer, admin)
- **Core entities:** Main database tables
- **Key routes:** API endpoints needed

## Step 2: Backend Scaffolding

Create three files in `packages/api/src/modules/{name}/`:

- **schema.ts** — Drizzle tables. Every table MUST have `tenant_id` FK.
- **service.ts** — Business logic. NEVER access Hono context. Receive typed params.
- **routes.ts** — Hono sub-router. Validate ALL input with Zod. Delegate to service.

Mount in `packages/api/src/index.ts`:
```typescript
import { {name}Router } from './modules/{name}/routes';
app.route('/api/modules/{name}', {name}Router);
```

Push schema: `npm run db:push`

## Step 3: Frontend Scaffolding

Create in `packages/web/src/apps/{name}/`:

```
apps/{name}/
  index.ts          — module registration (MiniAppDefinition)
  types.ts          — module-specific types
  hooks/keys.ts     — TanStack Query key factory
  hooks/use{Name}.ts — query/mutation hooks
  merchant/         — staff-facing views
  customer/         — customer-facing views
  __tests__/
```

Register in `packages/web/src/platform/registry.ts`.

## Step 4: Write Tests

1. **L1 (Unit):** Service functions, tenant isolation
2. **L2 (Integration):** Route handlers, Zod validation
3. **L3 (Behavioral):** Browser interactions
4. **L4 (Output):** If produces artifacts, verify content

## Step 5: Verify

Run `/verify` to confirm end-to-end.

## Checklist

- [ ] schema.ts with tenant_id on all tables
- [ ] service.ts with typed params (no Hono context)
- [ ] routes.ts with Zod validation
- [ ] Router mounted in index.ts
- [ ] Schema pushed
- [ ] Module registered in registry.ts
- [ ] Query key factory
- [ ] Data fetching hooks
- [ ] At least one route per audience
- [ ] Unit tests for service
- [ ] Tenant isolation tests
- [ ] /verify passes
