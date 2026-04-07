# Testing Rules

## The Testing Depth Framework

Every change requires testing at the **appropriate depth**. A visual snapshot is NOT a complete
test. Think about WHAT the change does and test accordingly.

### Layer 1: Unit Tests (Logic)

Tests pure functions, computations, data transformations in isolation.

**When required:** Any change that adds or modifies business logic, utility functions, data
processing, service layer functions, or state management.

**What to test:**
- Input/output correctness with concrete values
- Edge cases (empty, null, overflow, unicode, multi-tenant isolation)
- Error handling paths
- Tenant ID filtering (every service function that touches the DB)

**NOT sufficient alone for:** Anything that connects to the UI, API, or external systems.

```typescript
// GOOD: tests actual logic with concrete values
expect(calculateOrderTotal([
  { price: 12.50, quantity: 2 },
  { price: 8.00, quantity: 1 },
])).toBe(33.00);

// BAD: vague assertion
expect(calculateOrderTotal(items)).toBeTruthy();
```

### Layer 2: Integration Tests (Wiring)

Tests that components are connected correctly.

**When required:** Any feature that involves UI interacting with backend, navigation, or
cross-component communication.

**What to test:**
- Clicking a button calls the correct handler with correct arguments
- The handler makes the correct API call (URL, method, params, including tenantId)
- Navigation works (correct route, correct params)
- Error states are handled

### Layer 3: Behavioral E2E Tests (Flow)

Tests actual user flows end-to-end in the browser using chrome-devtools MCP.

**When required:** Any user-facing feature — new pages/routes, CRUD operations, multi-step
workflows.

**Critical: "visible in snapshot" does not equal "working".** A button can appear but do
nothing on click. You MUST test the interaction.

### Layer 4: Output Verification (Correctness)

Tests that the OUTPUT of a feature is correct.

**When required:** Any feature that produces artifacts: file exports, receipts, reports, QR codes,
API responses with structured data.

## Deciding What Depth You Need

| Question | If YES |
|----------|--------|
| Does it have logic? | Layer 1 (unit tests) |
| Does it connect UI to backend? | Layer 2 (integration tests) |
| Can a user interact with it? | Layer 3 (behavioral E2E) |
| Does it produce output/artifacts? | Layer 4 (output verification) |

Most features need **multiple layers**. A new "Place Order" feature needs ALL FOUR.

**Tenant isolation test:** Every module MUST have a test that verifies tenant A's data
is not visible to tenant B.

## File Locations

```
packages/api/src/modules/{module}/__tests__/{Name}.test.ts
packages/api/src/lib/__tests__/{Name}.test.ts
packages/web/src/apps/{app}/__tests__/{Name}.test.tsx
packages/web/src/components/__tests__/{Name}.test.tsx
```

## Running Tests

```bash
# Module-scoped (agents)
npm run test --workspace=packages/web -- src/apps/ordering/
npm run test --workspace=packages/api -- src/modules/ordering/

# Full suite (lead only)
npm test

# With marker for hooks
bash .claude/hooks/run-tests.sh
bash .claude/hooks/run-tests.sh --module ordering
```
