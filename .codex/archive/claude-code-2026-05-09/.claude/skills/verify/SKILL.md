---
name: verify
description: E2E browser verification using chrome-devtools MCP — visual, behavioral, AND output checks
user_invocable: true
---

# /verify — E2E Browser Verification

Run this skill to verify the app works correctly in the browser. This is NOT just a visual check — you must verify **behavior** and **output correctness** too.

## Prerequisites

- Dev servers running: API (port 3001) + Web (port 5173)
- Chrome browser open and connected via chrome-devtools MCP

## Verification Layers

### 1. Visual Check (Presence)

- `mcp__chrome-devtools__navigate_page` to target URL
- `mcp__chrome-devtools__take_snapshot` — verify elements are present

**This is necessary but NOT sufficient.**

### 2. Behavioral Check (Interaction)

For every new/changed interactive element:
- `mcp__chrome-devtools__click` on the element
- `mcp__chrome-devtools__take_snapshot` after click — verify state changed
- `mcp__chrome-devtools__list_network_requests` — verify expected API calls fired

### 3. Output Verification (Correctness)

For features that produce output:
- Use `evaluate_script` to fetch API endpoints and inspect responses
- Check: correct data, correct format

### 4. Error State Check

- `mcp__chrome-devtools__list_console_messages` — no unexpected errors
- Test at least one error path
- Verify tenant middleware rejects invalid tenant

### 5. API Health

```javascript
mcp__chrome-devtools__evaluate_script({
  function: "async () => { const r = await fetch('/api/health'); return r.ok ? 'healthy' : 'unhealthy'; }"
})
```

### 6. Write Verify Marker

On pass (ALL appropriate layers checked):
```bash
echo "PASS $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .claude/workflow/verify-marker.txt
```

## Deciding What to Verify

| Question | If YES, do this |
|----------|-----------------|
| Did you add/change a visible element? | Layer 1: Visual snapshot |
| Did you add/change an interactive element? | Layer 2: Click it, verify behavior |
| Does the feature produce output? | Layer 3: Verify output content |
| Does it have error handling? | Layer 4: Test an error path |
| Does it involve tenant data? | Verify tenant isolation |

**NEVER** write the verify marker after only doing visual checks for a feature that has interactive elements.
