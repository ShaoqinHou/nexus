# TDD Workflow

## 6-Phase Development Process

### Phase 1: Design
Write a design doc in `.claude/workflow/design/{feature}.md` with:
- Feature description and user stories
- Behavioral specifications (given/when/then)
- API contracts (endpoints, request/response shapes)
- Component hierarchy and data flow
- Tenant isolation requirements

### Phase 2: Scaffold
Create folder structure from the design:
- Backend: module files (schema.ts, service.ts, routes.ts)
- Frontend: app files (routes, components, hooks)
- `__tests__/` directories in both
- Type definitions

For new modules, use the `/new-module` skill.

### Phase 3: Tests (Red)
Write failing tests FIRST at the appropriate **testing depth** (see `.claude/rules/testing.md`):

For each change, determine which layers are needed:
- **Layer 1 (Unit):** Business logic, service functions -> unit tests with concrete values
- **Layer 2 (Integration):** UI/backend wiring -> test that clicks trigger correct API calls
- **Layer 3 (Behavioral):** User flows -> verify interactions produce results in browser
- **Layer 4 (Output):** Features producing artifacts -> verify content correctness

Most features need MULTIPLE layers. A new "Place Order" feature needs all four.
Tests should fail because the implementation does not exist yet.

**Tenant isolation test:** Every module MUST have a test that verifies tenant A's data
is not visible to tenant B.

### Phase 4: Implement (Green)
Make the tests pass:
- Write the minimum code to pass each test
- Run tests frequently: `bash .claude/hooks/run-tests.sh --module {name}`
- Do not over-engineer — just make tests green

### Phase 5: E2E Verify (HARD GATE)
Browser verification with chrome-devtools MCP via `/verify` skill.

**"Visible in snapshot" does not equal "working."** You MUST verify:
- **Visual:** Elements render correctly (snapshot)
- **Behavioral:** Interactive elements do something when clicked
- **Output:** Features that produce artifacts generate correct content
- **Errors:** No unexpected console errors or failed network requests
- **Tenant:** Data is correctly isolated per tenant

Verify-marker must NOT be written until all appropriate layers are checked.

### Phase 6: Review
Final quality checks:
- Code quality — no `any`, named exports, clean imports
- Test coverage — all new code has tests
- Security — no injection vulnerabilities, input validation, tenant isolation
- Import boundaries respected (apps, modules, components)
- Design tokens used (no hardcoded colors)

## Bug-Fix Fast Path
For small fixes (single file, clear bug):
1. Skip phases 1-2
2. Write a regression test (phase 3)
3. Fix the bug (phase 4)
4. Run `/verify` (phase 5)

## Module Structure
```
packages/api/src/
  db/              — Drizzle client, platform schema, migrations
  middleware/      — auth, tenant, session
  routes/          — Platform routes (auth, tenants, health)
  modules/         — Mini-app backend modules
    ordering/      — routes.ts, service.ts, schema.ts
  lib/             — Shared utilities

packages/web/src/
  platform/        — Shell (auth, tenant, theme, registry)
  apps/            — Mini-app frontend modules
    ordering/      — merchant/, customer/, hooks/, types.ts, index.ts
  components/
    ui/            — Shared primitives (Button, Card, Badge, Dialog, Input, Toggle)
    patterns/      — Reusable app patterns (DataTable, FormField, StatusBadge)
  lib/             — Utilities, API client
```

## Artifact Locations
- Design docs: `.claude/workflow/design/{feature}.md`
- Test results: `.claude/workflow/test-result.txt`
- Verify marker: `.claude/workflow/verify-marker.txt`
- Issues log: `.claude/workflow/issues.md`
- Status: `.claude/workflow/STATUS.md`
- Archive: `.claude/workflow/archive/` — completed work that is done

## Agent Team Pattern

When a task is complex enough to warrant it, use the Agent tool to spawn parallel subagents:
- **Explore agent** — for codebase research, reading files, answering "what is X" questions
- **general-purpose agent** — for implementing code, writing tests, making edits
- Multiple agents can run in parallel for independent tasks (docs, tests, features)
- Agent results come back as tool results — synthesize them yourself before acting
- Name agents so you can SendMessage to resume them

## Deploy to Production

1. Build: `cd packages/web && MSYS_NO_PATHCONV=1 npx vite build --base /nexus/`
   ⚠️  Must run FROM packages/web/ directory — `npm run build` at root does NOT set --base and produces broken /assets/ paths
2. SSH: `ssh -i ~/.ssh/DIOkii root@134.199.148.87`
3. Pull latest: `cd /root/monoWeb/nexus && git pull`
4. Copy static: `rsync -av --delete packages/web/dist/ root@134.199.148.87:/var/www/cv.rehou.games/nexus/`
5. Restart API: `ssh -i ~/.ssh/DIOkii root@134.199.148.87 systemctl restart nexus-api`
6. Verify: curl https://cv.rehou.games/nexus/ → should return HTML
