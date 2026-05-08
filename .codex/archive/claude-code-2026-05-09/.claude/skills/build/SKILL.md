---
name: build
description: Quick reference for dev commands
user_invocable: true
---

# /build — Development Commands

## Start Servers
```bash
npm run dev:all          # Start both API + Web
npm run dev:api          # API only (port 3001)
npm run dev:web          # Web only (port 5173)
```

## URLs
- API: http://localhost:3001
- Web: http://localhost:5173
- API health: http://localhost:3001/api/health

## Testing
```bash
npm test                                                    # Full suite
npm run test --workspace=packages/api                       # API tests only
npm run test --workspace=packages/web                       # Web tests only
npm run test --workspace=packages/web -- src/apps/ordering/ # App tests
npm run test --workspace=packages/api -- src/modules/ordering/  # Module tests
bash .claude/hooks/run-tests.sh                             # Full suite + marker
bash .claude/hooks/run-tests.sh --module ordering           # Module + marker
```

## Build
```bash
npm run build            # Build web package (tsc + vite build)
```

## Database
```bash
npm run db:push          # Push schema changes (drizzle-kit)
npm run db:generate      # Generate migration
npm run db:studio        # Open Drizzle Studio
```

## Platform Notes
- Windows MINGW64 — use forward slashes
- Prefix `MSYS_NO_PATHCONV=1` before `--base /path/` commands
- Use `python` not `python3`
