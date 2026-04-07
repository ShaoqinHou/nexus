# 6-Layer Consistency Audit

## Layer 1: DATA — Single Source of Truth

Every constant, type, and utility should be defined ONCE and imported everywhere.

### Grep queries
```bash
rg "tenantId\|tenant_id" --type ts -l     # Is tenantId handled consistently?
rg "nanoid" --type ts -l                   # ID generation in one place?
rg "toISOString" --type ts -l              # Timestamp formatting consistent?
rg "interface.*Item" --type ts -l          # Duplicated type definitions?
rg "const.*STATUS" --type ts -l            # Status enums duplicated?
```

### What to check
- Same type defined in multiple files (API vs web drift)
- Same utility function copy-pasted across modules
- Magic strings/numbers repeated without a constant
- tenantId handling pattern consistent across all modules

## Layer 2: BEHAVIOR — Same Type = Same Behavior

### Grep queries
```bash
rg "onClick.*delete\|onDelete" --type tsx -l   # All deletes have confirmation?
rg "Dialog\|Modal" --type tsx -l               # All dialogs use shared component?
rg "toast\|Toast" --type tsx -l                # All feedback uses toast system?
rg "useMutation" --type tsx -l                 # All mutations have error handling?
```

### What to check
- All destructive actions have ConfirmButton (two-click)
- All dialogs use the shared Dialog component
- All mutations show toast feedback on success/error
- All forms validate before submit
- All lists handle empty state

## Layer 3: VISUAL — Same Look

### Grep queries
```bash
rg "bg-gray-\|bg-slate-\|bg-zinc-" --type tsx -l  # Hardcoded colors (should use tokens)
rg "text-gray-\|text-slate-" --type tsx -l          # Hardcoded text colors
rg "#[0-9a-fA-F]{3,8}" --type tsx -l               # Hex colors in components
rg "style=\{" --type tsx -l                         # Inline styles (usually wrong)
```

### What to check
- All colors use CSS custom property tokens, not Tailwind color classes
- All components use shared primitives
- Font sizes and weights consistent for same element types

## Layer 4: CODE — No Duplication

### Grep queries
```bash
rg "db\.select\(\)\.from\(" --type ts -l       # How many direct DB queries?
rg "c\.var\.tenant" --type ts -l               # Tenant access pattern
rg "zValidator" --type ts -l                   # All routes validate input?
rg "fetch\(" --type tsx -l                     # Direct fetch (should use hooks)?
```

### What to check
- Same DB access pattern repeated (should be in service layer)
- All API calls go through TanStack Query hooks
- No copy-pasted components across app modules

## Layer 5: STATE — Centralized Control

### Grep queries
```bash
rg "useState" --type tsx -l                    # Where is local state used?
rg "useContext\|createContext" --type tsx -l    # Context usage
rg "localStorage" --type tsx -l                # Direct storage access?
```

### What to check
- Auth state only in AuthProvider
- Tenant state only in TenantProvider
- No direct localStorage access outside platform providers

## Layer 6: ANIMATION — Consistent Motion

### What to check
- All dialogs use same open/close animation
- All toasts animate consistently
- Hover transitions consistent
- Page transitions use the same pattern

## Anti-Patterns to Flag

1. **Missing tenant filter** — DB query without tenant_id WHERE clause
2. **Service accessing Hono context** — `c.req` or `c.var` in service.ts
3. **Cross-app import** — apps/ordering importing from apps/loyalty
4. **Cross-module import** — modules/ordering importing from modules/loyalty
5. **Hardcoded colors** — Tailwind color classes instead of CSS tokens
6. **Direct fetch** — `fetch('/api/...')` instead of TanStack Query hook
7. **Missing Zod validation** — route handler without `zValidator`
8. **Large components** — files > 400 lines mixing rendering + logic
9. **Direct localStorage** — outside platform providers
