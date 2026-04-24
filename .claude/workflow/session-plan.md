# Autonomous Session Plan — design-workflow-v2

**Status key:** `[ ]` pending · `[~]` in-progress · `[x]` done · `[!]` blocked

**Started:** 2026-04-25 by lead session.
**Branch:** `feat/design-workflow-v2` (auto-push every phase complete).
**Review loop:** paused via `scratch/review-pause` during Phase 1, re-enabled at Phase 2.
**Model tier:** Sonnet default, Opus for hard design calls (architecture, standards authoring).
**Watchdog:** CronCreate durable job, every ~31 min — fires prompt below.
**User away:** indefinite; resume until all phases `[x]`, then stop scheduling.

---

## Watchdog resume prompt (the cron payload)

```
AUTONOMOUS DESIGN-WORKFLOW-V2 WATCHDOG TICK.

The user began an autonomous lead-mode session to:
  1. Update nexus workflow (GLM-agent refs → Sonnet, add new design-system patterns).
  2. Implement Claude Design bundle patterns: design/reference/ baseline, /design/* zoo,
     registry.json, ESLint design-token lint, 10 cuisine themes, dietary sprite, hit-target tokens.
  3. Sweep codebase to conform, full E2E verify, final walkthrough.

Current state in .claude/workflow/session-plan.md — read it first and resume from the
earliest phase not marked [x]. Update status markers as you progress. Re-write the
plan file when phase boundaries move. If all phases are [x], do the final E2E in Phase 6
and then call CronDelete to stop the watchdog.

Branch: feat/design-workflow-v2 — commits auto-push.
Review loop: check for .claude/workflow/scratch/review-pause — respect its current state.
DO NOT commit to main. DO NOT skip hooks. DO NOT delete the watchdog until Phase 6 done.

If quota / rate-limited, write a brief note to session-plan.md's "Notes" section and
yield until next tick. Do not burn the quota retrying.
```

---

## Phase 0 — Setup (this tick)

- [x] Write this file
- [ ] Create `feat/design-workflow-v2` branch + push
- [ ] Drop `.claude/workflow/scratch/review-pause` sentinel (pauses review during workflow edits)
- [ ] Schedule 31-min durable watchdog CronCreate
- [ ] Audit the 4 files with GLM references — classify as "agent-model refs (replace)" vs "z.ai translation product feature (keep)"

## Phase 1 — Workflow updates (review PAUSED)

Editing the review/fixer system itself, so review stays off.

- [ ] **1.1** GLM→Sonnet rename across `.claude/**`. Preserve z.ai translation-service references (product feature, not agent model). Preserve Opus nuance for hard design decisions.
- [ ] **1.2** Add new standards to `.claude/workflow/design/standards.md`:
      - `S-DESIGN-REFERENCE` — committed `design/reference/v1/` is read-only, edits blocked.
      - `S-REGISTRY-ENTRY` — every `components/ui/*.tsx` and `components/patterns/*.tsx` must have a `registry.json` entry.
      - `S-ZOO-PAGE` — every primitive/pattern must have a `/design/<name>` route.
      - `S-HEX-LITERAL` — no raw `#RRGGBB` in `apps/**` or `components/**` (exempt token files + SVG internals).
      - `S-HIT-TARGET` — interactive elements use `--hit-sm/md/lg` tokens, not arbitrary pixels.
      - `S-LUCIDE-ONLY` — utility icons from Lucide only; dietary/spice/promo from `dietary-icons.svg` sprite.
      - `S-DIETARY-SPRITE` — no emoji or unicode glyphs for dietary/allergen markers.
- [ ] **1.3** Update `.claude/agents/reviewer.md` — reference new standard IDs, new trap registry entries.
- [ ] **1.4** Update `.claude/agents/fixer.md` — mention new standards.
- [ ] **1.5** Add `.claude/rules/design-system.md` additions: reference bundle location, registry format, zoo pattern, ESLint layer.
- [ ] **1.6** Update trap registry in `nexus/CLAUDE.md`: `hardcoded-hex-chrome`, `missing-registry-entry`, `missing-zoo-page`, `hit-target-hardcoded-px`.
- [ ] **1.7** Commit workflow changes on branch. (No review fires — paused.)

## Phase 2 — Re-enable review + pilot commits (review ON)

The real shakedown of the commit-review loop.

- [ ] **2.1** Remove `scratch/review-pause` sentinel.
- [ ] **2.2** Commit `design/reference/v1/` (copy Claude Design bundle from `C:\Users\housh\Downloads\Nexus Design System-handoff\nexus-design-system` → `nexus/design/reference/v1/`). This is a large, unopinionated commit — good first loop exercise.
- [ ] **2.3** Watch review loop fire. If Reviewer/Fixer stalls or misbehaves, log to `issues.md` and fix before proceeding.
- [ ] **2.4** Add ESLint hex-literal rule + Stylelint color-no-hex. Config only; don't fix violations yet.
- [ ] **2.5** Add `--hit-sm/md/lg` tokens to `tokens.css` + retrofit Button sizing. Small, high-signal commit.
- [ ] **2.6** Confirm 3 consecutive clean runs of the review loop. If any BLOCK findings → fix → verify → continue.

## Phase 3 — Design system infrastructure (review ON)

- [ ] **3.1** Create `packages/web/src/components/ui/registry.json` + `packages/web/src/components/patterns/registry.json` listing every primitive/pattern with { path, purpose, props, dependencies, tokens-used }.
- [ ] **3.2** Build `/design/*` route tree (zoo). One route per primitive + pattern + tokens page + theme switcher. Import from real source, not copy. Dev-only bundle split.
- [ ] **3.3** Port the 10 cuisine themes from `design/reference/v1/themes/` → `packages/web/src/platform/theme/themes/*.css`. Extend ThemeProvider with `data-theme` attribute wiring.
- [ ] **3.4** Port themed components: OrderTracker, Receipt, PromoCard, CheckoutSummary. Wire to real data.
- [ ] **3.5** Port `dietary-icons.svg` sprite → `packages/web/src/assets/dietary-icons.svg`. Create `<DietaryIcon name="...">` primitive. Replace any emoji in apps/ordering.
- [ ] **3.6** Self-host Inter + JetBrains Mono. Copy woff2 from reference bundle `fonts/` → `packages/web/public/fonts/`. Wire `@font-face`.
- [ ] **3.7** Wire per-tenant `--color-brand` runtime override in ThemeProvider (currently set in ThemeSettings but not applied — see codebase audit).

## Phase 4 — Codebase sweep (review ON)

- [ ] **4.1** ESLint sweep: fix every hex-literal violation in `apps/**` + `components/**`. Worst offenders identified: KitchenDisplay.tsx (purple hardcodes), ThemeSettings.tsx (default brand #2563eb), QRCodes.tsx (qrcode lib border).
- [ ] **4.2** Verify `import/no-restricted-paths` boundaries hold everywhere.
- [ ] **4.3** Confirm every UI primitive and pattern has a registry.json entry + zoo page.
- [ ] **4.4** Smoke-run `npm test` — all 203+21+7 tests still green.

## Phase 5 — E2E verification (review ON)

Use chrome-devtools MCP. Start dev server (`npm run dev:all`). Take snapshots, click through, read console.

- [ ] **5.1** Dev server up on 3001 (api) + 5173 (web). Verify health endpoint.
- [ ] **5.2** Zoo walkthrough: visit every `/design/*` route in light + dark mode, rotate through 10 themes, screenshot-and-snapshot each. Log any broken renders.
- [ ] **5.3** Merchant flow E2E: login (demo@example.com / password123) → tenant picker → menu CRUD → orders board → kitchen display → QR codes → settings/theme.
- [ ] **5.4** Customer flow E2E: /order/demo?table=1 → browse menu → item detail → modifiers → cart → place order → confirmation → poll for status.
- [ ] **5.5** Multi-tenant isolation spot-check: tenant A=demo vs tenant B=sakura — no data bleed.
- [ ] **5.6** Run all 10 cuisine themes against customer menu screen. Capture visual-diff issues.
- [ ] **5.7** Write `e2e-<timestamp>.md` report in `.claude/workflow/scratch/`.

## Phase 6 — Consolidation + final walkthrough

- [ ] **6.1** Merge any `auto-fix/*` branches from Reviewer loop.
- [ ] **6.2** Final full-app E2E: boot → merchant → customer → back. One clean pass top-to-bottom.
- [ ] **6.3** Update STATUS.md with what shipped.
- [ ] **6.4** Mark all phases `[x]` here.
- [ ] **6.5** `CronDelete` the watchdog.
- [ ] **6.6** Final summary at tail of this file.

---

## Notes / Blockers / Running Log

(Append entries below. Most-recent first.)

- 2026-04-25 Setup tick — creating plan file + feature branch.

---

## Known constraints

- Shell landed in worktree `.claude/worktrees/focused-pasteur-7ffd29` on startup — always use absolute paths or `cd` to `/c/Users/housh/Documents/monoWeb/nexus` before running git commands.
- MSYS_NO_PATHCONV=1 needed before `vite build --base /path/` on MINGW.
- Use `python` not `python3`.
- On MINGW, jq may not be available — use `node -e` for JSON.
- `z.ai` GLM translation SERVICE is a product feature (keep). Agent-model `glm-4` references are what get renamed to Sonnet.
