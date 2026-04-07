---
name: test
description: Testing conventions and patterns
user_invocable: true
---

# /test — Testing Conventions

## File Naming

Tests go in a `__tests__/` directory next to the code they test:

```
packages/api/src/modules/ordering/__tests__/service.test.ts
packages/api/src/lib/__tests__/tenant.test.ts
packages/web/src/apps/ordering/__tests__/OrderForm.test.tsx
packages/web/src/components/ui/__tests__/Button.test.tsx
```

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateOrderTotal } from '../service';

describe('calculateOrderTotal', () => {
  it('sums prices multiplied by quantities', () => {
    const result = calculateOrderTotal([
      { price: 12.50, quantity: 2 },
      { price: 8.00, quantity: 1 },
    ]);
    expect(result).toBe(33.00);
  });

  it('returns 0 for empty items', () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});
```

## Mocking Patterns

### MSW for API mocking (web tests)
```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/modules/ordering/menu', () => {
    return HttpResponse.json({
      data: [{ id: '1', name: 'Kung Pao Chicken', price: 16.50 }],
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Tenant isolation test pattern
```typescript
describe('tenant isolation', () => {
  it('returns only items for the requested tenant', async () => {
    await seedMenuItem({ tenantId: 't1', name: 'Item A' });
    await seedMenuItem({ tenantId: 't2', name: 'Item B' });

    const result = await getMenuItems(db, 't1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Item A');
  });
});
```

## Assertion Rules
- **Concrete values:** `expect(total).toBe(33.00)` not `expect(total).toBeTruthy()`
- **Specific strings:** `expect(name).toBe('Kung Pao Chicken')` not `expect(name).toBeDefined()`
- **Tenant isolation:** Always verify cross-tenant queries return empty

## Running Tests
```bash
npm run test --workspace=packages/web -- src/apps/ordering/   # Module-scoped
npm run test --workspace=packages/api -- src/modules/ordering/ # Module-scoped
npm test                                                       # Full suite
bash .claude/hooks/run-tests.sh --module ordering              # With marker
```
