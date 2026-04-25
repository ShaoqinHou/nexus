# Tool-Usage Brief: Multi-Agent Role-Play E2E

Lessons distilled from the 5-character role-play E2E run on 2026-04-25.
Read this before launching the next role-play.

## When to use the role-play pattern

**Right fit**:
- Verify cross-party flows the system was designed to support (customer
  orders → kitchen processes → SSE updates the customer's confirmation).
- Verify tenant isolation under realistic concurrent load.
- Verify a refactor didn't break interactive flows that touch multiple
  surfaces (force-swap retheme touched OrderConfirmation, CartSheet, KDS,
  MenuBrowse — single-actor E2E couldn't catch cross-surface drift).

**Wrong fit**:
- Single-component visual checks (use Zoo + screenshot).
- Pure backend correctness (use `npm test --workspace=packages/api` with
  isolation tests).
- Performance / load (the role-play is correctness under concurrency, not
  throughput).

## Agent isolation policy

| Setting | Use when | Why |
|---|---|---|
| `isolation: "worktree"` | Mechanical refactor sweeps where each agent owns a different folder | Agents touch source; worktree prevents merge conflicts; main repo is the merge point |
| **No isolation** (default) | Role-play E2E, multi-agent coordination, anything that needs shared scratch writes | Worktrees sandbox out writes to the parent's `.claude/workflow/scratch/` — exactly where role-play coordination lives |
| Reviewer / read-only audits | Always | They write only to scratch; no isolation needed |

**Concrete rule**: if your agents need to read or write a shared state file,
do NOT use worktree isolation. The first role-play run had 4 of 5 agents fail
to write their reports/sentinels; the lead session had to do it manually.

## chrome-devtools MCP — multi-agent ground rules

The MCP runs ONE Chrome instance shared across the parent session. Each
character agent claims its own page via `new_page` and uses `select_page`
before every browser action. Without strict `select_page` discipline, agents
race on the "currently selected" tab.

**Do**:
- `pageIdx = await new_page(url)` — first thing each agent does
- `select_page(pageIdx)` immediately before every `take_snapshot`, `click`,
  `fill`, `evaluate_script`
- Use `list_pages` early to confirm which pageIdx is yours

**Don't**:
- Assume the tab you opened is still selected after another agent acts.
- Use `mcp__chrome-devtools__resize_page` for media-query verification — it
  doesn't fire CSS media rules. Use `emulate({ device: '...' })` instead.

**Headless mode**: chrome-devtools MCP defaults to headful. Set `HEADLESS=1`
or equivalent env var if your runtime supports it. Headful works for
agent-driven tests; the visual artifact is the screenshots, not real-time
human view.

## Coordination patterns

The role-play used **file-based sentinels** in `scratch/e2e-rolepay/`. This
worked for the upstream→downstream chain (Maya → customers → kitchen) but
exposed the worktree-write-denial problem. Three patterns ranked:

### 1. File sentinels (recommended for ≤6 agents)

```bash
# upstream agent writes
echo "READY" > scratch/e2e-rolepay/maya-ready.flag

# downstream agent waits (max 90s)
for i in $(seq 1 45); do
  [ -f scratch/e2e-rolepay/maya-ready.flag ] && break
  sleep 2
done
```

Pros: simple, no extra infra, debuggable (lead session can `cat` the flag).
Cons: agents need write access to shared dir → don't use worktree isolation.

### 2. Database polling (when state is naturally in DB)

Aiko's "did Liam mark my order ready" was naturally a DB state question. She
could have polled `/api/order/demo/ordering/orders/:orderId` and checked
`status === 'ready'` — the SHARED DEV-SERVER + SHARED SQLITE provides
this for free.

Pros: no synthetic sentinels; the system's own state is the signal.
Cons: requires the agent to have proper request semantics (cookies, auth)
to read the state.

### 3. SendMessage between named agents (only if direct dialogue is needed)

Each `Agent({ name: "Maya", ... })` becomes addressable via
`SendMessage({ to: "Maya", ... })` from the parent. Useful when the parent
needs to push state TO an agent mid-flight, less useful for agent-to-agent
peer messages (which still flow through the parent).

## User-story design

### State reset before each run

If the test cares about table state (Marco's `JoinExistingOrder` detour
came from a stale `pending` order), the test must reset the seed first.
Add to the user-story preamble:

```
Pre-run: from main checkout, run `npm run db:seed` to reset Demo +
Sakura to fixtures. Confirm no `pending` orders on tables 3, 7, 1
via DB query before launching agents.
```

### Detect known intermediate screens

The customer QR flow has a `JoinExistingOrder` page (`status` ∈ active set
on the table). Customer-flow scripts must:

1. Navigate to `/order/:slug?table=N`
2. **Check** for the 3-button screen first
3. If present, click "Start new order" or whichever path the script wants
4. Only then proceed with menu interaction

### Status-gated UI

Cancel buttons disappear after the order is `ready`. EditableItemNotes may
disappear after `delivered`. When the script tests BOTH UI presence AND
state advancement, ordering matters:

- Either: verify all interactive UI BEFORE the kitchen agent advances state
- Or: split into two characters (one verifies pre-state, one verifies post-)

### Auto-explore latitude vs script discipline

Each character should have:

- 5-8 SCRIPTED steps with explicit pass/fail criteria — what we definitely
  want to verify
- An "auto-explore" addendum (try the language picker, test mobile
  resize, etc.) — finds emergent bugs the scripted path missed

The scripted steps must include **observation criteria** that don't depend on
intermediate-screen detours. E.g. "verify OrderTracker has data-theme on
its wrapper" is testable regardless of whether JoinExistingOrder fired.

## Lead-session orchestration

After dispatching agents in parallel, the lead session should:

1. Watch for completion notifications (don't poll background tasks).
2. When an agent reports a sandbox failure (Write/Bash denied), the lead
   writes the sentinel/report on the agent's behalf to unblock downstream
   waiters. Do this IMMEDIATELY — downstream timeouts are typically 60-90s.
3. Watch for false-negatives in agent reports (Aiko's "no `<use>` found"
   was a misread). Verify with grep / direct DOM inspection from the lead.
4. After all agents return, write a CONSOLIDATED report referencing each
   character's individual report and synthesizing cross-character findings
   that no single agent could see (e.g. tenant isolation under load).

## Cleanup checklist (every role-play run)

- Kill leftover node processes: `taskkill //F //IM node.exe` (Windows) or
  equivalent
- Delete sentinel files: `rm scratch/e2e-rolepay/*.flag`
- Reset DB if the role-play wrote state: `npm run db:seed`
- Disable watchdog if it was re-armed for the run

## When NOT to spawn 5 agents

The user's "fan-out vs sequential" question (asked earlier in the session)
applies here:

- 5 character agents = **5× token cost** vs. 1 agent doing all 5 roles
  sequentially.
- The cross-character verification (tenant isolation under concurrent load,
  SSE pipeline under multi-tab pressure) genuinely needs concurrency.
- For pure flow-correctness checks (does the customer order placement work?
  does the kitchen mark-ready work?), one sequential agent is cheaper and
  cleaner.

Use the 5-agent role-play when the test's *value* is the concurrency. For
sequential single-actor flow checks, use the existing headless E2E pattern
(see commit `a7d71f0a` for an example of a single-actor full-app walkthrough).
