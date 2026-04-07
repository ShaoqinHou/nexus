# Import Boundary Rules

## The Rule

Code in one domain CANNOT import from another domain at the same level. Code CAN import
from layers below it (shared infrastructure).

## Frontend Boundaries (packages/web/src/)

### Apps cannot import from other apps

```typescript
// FORBIDDEN — apps/ordering/ importing from apps/loyalty/
import { LoyaltyBadge } from '@web/apps/loyalty/components/LoyaltyBadge';

// CORRECT — extract to shared components if needed by multiple apps
import { StatusBadge } from '@web/components/patterns/StatusBadge';
```

### UI components cannot import from apps or platform

```typescript
// FORBIDDEN — components/ui/ importing from apps/
import { OrderStatus } from '@web/apps/ordering/types';

// CORRECT — UI components are generic, use generic props
interface BadgeProps { variant: 'success' | 'warning' | 'error'; children: ReactNode; }
```

### Allowed import directions

```
apps/{name}/  ->  CAN import from:
  ├── components/ui/        (primitives)
  ├── components/patterns/  (reusable patterns)
  ├── platform/             (auth, tenant, theme, registry)
  └── lib/                  (utilities, API client)

components/patterns/  ->  CAN import from:
  ├── components/ui/        (primitives)
  └── lib/                  (utilities)

components/ui/  ->  CAN import from:
  └── lib/                  (utilities only)

platform/  ->  CAN import from:
  ├── components/ui/
  ├── components/patterns/
  └── lib/
```

### Import aliases

- `@web` -> `packages/web/src`
- `@api` -> `packages/api/src`

Always use aliases, never relative paths that cross package boundaries.

## Backend Boundaries (packages/api/src/)

### Modules cannot import from other modules

```typescript
// FORBIDDEN — modules/ordering/ importing from modules/loyalty/
import { getLoyaltyPoints } from '../loyalty/service';

// CORRECT — use a shared lib utility
import { calculatePoints } from '../../lib/loyalty';
```

### Module internal flow (strict direction)

```
routes.ts  ->  service.ts  ->  schema.ts
                             ->  db/client.ts
```

Routes call services. Services call the database. Schema defines tables.
Never skip a layer (routes should NOT query the DB directly).

## When to Extract

- If 2+ apps need the same component -> extract to `components/patterns/`
- If 2+ apps need the same hook -> extract to `lib/hooks/` or `platform/`
- If 2+ modules need the same business logic -> extract to `lib/`

## Enforcement

The `PostToolUse` hook (`.claude/hooks/check-edited-file.sh`) automatically detects
cross-app imports in `apps/` files and cross-module imports in `modules/` files.
Violations are logged to `.claude/workflow/issues.md`.
