# Current State

Updated: 2026-05-09

## Original Request

The user asked for a real Codex-native adaptation of the old Claude Code workflow, not a rename. The full request is preserved at:

- `.codex/workflow/briefs/2026-05-09-original-user-brief.md`

## First Required Answer

Design system directory inside this project: yes.

Evidence checked:

- `C:\Users\housh\.codex\worktrees\7514\nexus\design`
- `C:\Users\housh\.codex\worktrees\7514\nexus\design\reference\v1\nexus-design-system`
- `C:\Users\housh\.codex\worktrees\7514\nexus\packages\web\src\platform\theme`
- `C:\Users\housh\.codex\worktrees\7514\nexus\packages\web\src\components\patterns\themed`
- `C:\Users\housh\.codex\worktrees\7514\nexus\packages\web\src\routes\__design`

## Active Goal

Build and validate a reusable Codex-native workflow that preserves the useful intent of the Claude setup:

- context-isolated research and worker agents,
- clear model routing with Spark allowed only for narrow slices,
- project pattern guidance,
- focused post-change review,
- durable records and resumable handovers,
- realistic workflow tests,
- server/deployment validation,
- continued design-system completion work after workflow migration.

## Current Phase

Codex workflow migration and the visual Zoo/Gym hardening pass are complete at branch HEAD. The workflow now includes a production-safe visual Zoo/Gym surface, hook/config enforcement checks, dependency-audit policy, CI gates, state-cache/history evidence validation, and dev-only Zoo route tightening. Local and server evidence are recorded in the centralized workflow records.

Implemented workflow pieces:

- `.codex/` workflow root with compact state, knowledge files, records, templates, research, scripts, hooks, agents, archived Claude material, and generated dashboard.
- `WORKFLOW.md` and `AGENTS.md` project entry points.
- Thin hook policy: hooks inject/invalidate/block/remind only; review, verification, audit, and pattern judgment stay in agents/skills/records.
- Dynamic pattern discovery: `record-pattern` creates evidence-based proposals before durable guidance is promoted.
- Dashboard/wiki/visualizer: `.codex/dashboard/index.html` summarizes state, records, gates, risks, deployment notes, and Design Zoo/Gym registry coverage.
- Public-safe workflow guide: `https://cv.rehou.games/nexus/workflow/` generated from `.codex/dashboard/public.html`.
- Production-safe visual Zoo/Gym guide: `.codex/dashboard/zoo/index.html`, intended for `https://cv.rehou.games/nexus/workflow/zoo/`.
- Active Claude workflow files are archived under `.codex/archive/claude-code-2026-05-09/`.
- Design-system continuation work: Toast now has semantic `info` styling, `warning` support, registry coverage, tests, and Design Zoo validation.

Hardening pass additions:

- Pattern proposal, routing, patch, review, test, audit, and deployment records are append-only after publication; corrections should be new records.
- Mutable state JSON files are treated as cache pointers only; gates now cross-check them against append-only markdown records before trusting patch, routing, review, verification, audit, or guide-browser evidence.
- Record integrity checks committed evidence-record history against the configured base branch when available, so clean CI checkouts can catch old record rewrites rather than only dirty-tree edits.
- Audits are first-class records under `.codex/workflow/records/audits/`.
- Guide-browser validation is a first-class evidence record under `.codex/workflow/records/guide-browser/`; it is excluded from guide source hashing to avoid a self-referential stale-guide loop.
- Routing records are structured and can constrain Spark write scope.
- Review records are typed: `general`, `pattern`, `design`, `workflow`, or `integrated`.
- Release gates include record integrity, hash-bound routing state, public guide safety/freshness, recorded guide browser validation, Zoo/Gym registry consistency, handover hygiene, and workflow self-tests.
- Generated guide artifacts are treated as user-facing workflow surfaces and must pass dedicated freshness/content-hash and recorded browser validation gates; their generator, source docs, state files, records, and workflow rules remain the substantive review surface.
- Public guide now includes workflow nodes, project/code structure, design-system flow, curated design docs, Zoo/Gym coverage, model-routing examples, and grouped event history.
- Public and repo-local guide generation now use source-hash metadata, production token subsets including hit-target tokens, redaction checks, and consistent legacy audit counting.
- The release gate distinguishes dirty patch state from clean committed branch state, and public guide source hashing is normalized across Windows CRLF and Linux LF checkouts.
- Model routing scenarios now assert Spark escalation fallback owners, not only escalation route names.
- Hook runtime heartbeats are written under `.codex/workflow/runtime/` when hooks are active.

Visual-Zoo/hook/dependency hardening additions:

- The local generated workflow guide now has a captured visual Zoo/Gym page with 54 screenshots from the real dev-only `/design` routes: desktop-light-sichuan and mobile-dark-sichuan contexts for every registry-backed page.
- The live `/design` Zoo now applies the selected cuisine theme to a demo wrapper and mirrors it to `document.body`, so body-mounted portal components are actually tested under the selected theme.
- Mobile Zoo layout was made responsive enough for the 390px capture to show real demo content, and screenshots are full-page with non-cropped source evidence in the generated guide.
- `packages/web/src/routeTree.tsx` creates the interactive `/design` route and dynamic import only under `import.meta.env.DEV`; local production build validation found no `Zoo-*.js` chunk.
- `workflow:capture-zoo-visuals`, `workflow:zoo-visual-guide`, and `workflow:zoo-visual-guide-check` generate and gate the visual surface.
- `.codex/config.toml` pins `sandbox_mode = "danger-full-access"` and `approval_policy = "never"` for the project Custom profile, while hooks remain advisory and thin.
- `workflow:hook-config-check` verifies config/hook wiring without putting judgment inside hooks.
- `audit:deps` and `workflow:dependency-audit-check` enforce `npm audit` with an explicit expiring baseline for the remaining dev-only `drizzle-kit` transitive advisories.
- Dependency-audit baseline entries are constrained by package, node path, via chain, effects, directness, root advisory source, current-use checks, and expiry.
- `workflow:prod-zoo-bundle-check` scans production build output to enforce that the interactive dev-only Zoo route/chunk is not shipped.
- `hooks.json` calls only `.codex/scripts/run-hook.mjs <event>`; `workflow:hook-config-check` rejects inline hook command logic and matcher drift.
- `.github/workflows/nexus-workflow-gates.yml` adds a CI backstop for dependency audit, design lint, tests, build, self-test, and release gate.

Representative gate records from the initial workflow migration:

- `PATCH-20260508T174121Z-codex-native-workflow-migration-claude-workflow-`
- `REVIEW-20260508T174152Z-review-pass-worktree`
- `TEST-20260508T174152Z-verification-pass-worktree`
- `REVIEW-20260508T174152Z-audit-pass-worktree`

Validation record navigation:

- Use `node .codex/scripts/nexus-workflow.mjs status` for the current hash and active gate state.
- Use `.codex/workflow/records/patches/`, `routing/`, `reviews/`, `tests/`, `audits/`, `guide-browser/`, and `deployments/` for detailed evidence.
- The generated dashboard and public guide summarize the record history without requiring this handover to name every latest record.

Server deployment validation:

- Record: `DEPLOYMENT-20260508T175020Z-server-deployment-validation-for-codex-native-wo`
- Branch pushed and deployed: `codex/native-workflow`
- Runtime/source commit deployed and rebuilt on server: `cf069ce`
- Post-deployment workflow-record commits were pulled on the server after runtime validation. Check branch HEAD for the exact latest commit.
- Server repo: `/root/monoWeb/nexus`
- Public web check: `https://cv.rehou.games/nexus/` returned 200.
- API health check: `https://cv.rehou.games/nexus/api/platform/health` returned 200.
- API service: `nexus-api` active after restart.
- Workflow file present on server: `.codex/scripts/nexus-workflow.mjs`
- Server workflow validation: `node .codex/scripts/nexus-workflow.mjs validate` passed.
- Static build correction: server rebuild used `npx vite build --base /nexus/`; hosted `index.html` referenced `/nexus/assets/`.
- Public guide deployment: `https://cv.rehou.games/nexus/workflow/` returned 200 after `.codex/dashboard/public.html` was copied to the static workflow path.
- Preserved server dirty state: pre-existing `package-lock.json` modification remains and was backed up to `/root/monoWeb/deploy-backups/nexus/package-lock-local-20260509-codex-native-workflow.diff`.

Second hardening pass deployment validation:

- Record: `DEPLOYMENT-20260509T083458Z-second-hardening-server-validation-after-clean-r`
- Server repo: `/root/monoWeb/nexus`
- Public guide URL: `https://cv.rehou.games/nexus/workflow/`
- Server release gate: `node .codex/scripts/nexus-workflow.mjs validate --release-gate` passed on a clean server worktree.
- Public guide check: `https://cv.rehou.games/nexus/workflow/` returned 200 and included Design Zoo/Gym coverage plus Model Routing Examples.
- Public app check: `https://cv.rehou.games/nexus/` returned 200 with `/nexus/assets/` URLs.
- API health check: `https://cv.rehou.games/nexus/api/platform/health` returned 200 with `{"status":"ok"}`.
- API service: `nexus-api` active.
- Server-only `package-lock.json` metadata churn was backed up under `/root/monoWeb/deploy-backups/nexus/` before cleanup; server git status was clean after cleanup and validation.
- The server should follow branch HEAD rather than a hardcoded final record commit, because record/handover commits can legitimately follow runtime validation.

Final visual Zoo/Gym guide deployment validation:

- Record: `DEPLOYMENT-20260509T113643Z-final-visual-zoo-guide-server-deployment-validat`
- Server repo: `/root/monoWeb/nexus`
- Runtime/source commit deployed and rebuilt on server: `54ffb85`
- Server gates passed: `npm run audit:deps`, `npm run lint:design`, `npm run test --workspace=packages/api`, `npm run test --workspace=packages/web`, `npx vite build --base /nexus/`, `npm run workflow:prod-zoo-bundle-check`, and `npm run workflow:release-gate`.
- Static deployment copied the `/nexus/` production build, `.codex/dashboard/public.html`, and `.codex/dashboard/zoo/` into `/var/www/cv.rehou.games/nexus/`.
- Public app check: `https://cv.rehou.games/nexus/` returned 200 and referenced `/nexus/assets/`.
- API health check: `https://cv.rehou.games/nexus/api/platform/health` returned 200 with `{"status":"ok"}`.
- API service: `nexus-api` active after restart.
- Public guide check: `https://cv.rehou.games/nexus/workflow/` returned 200 and linked the visual Zoo/Gym guide.
- Visual Zoo/Gym guide check: `https://cv.rehou.games/nexus/workflow/zoo/` returned 200, loaded 54 screenshots, and had 0 broken image links in both desktop and mobile Playwright passes.
- Browser evidence: use `node .codex/scripts/nexus-workflow.mjs status` for the latest hash-bound `GUIDE-BROWSER-*` record.
- After deployment-record commits, pull branch HEAD on the server again so the server source copy includes the latest records; runtime assets are already deployed from `54ffb85`.

Historical/model-routing evidence:

- `TEST-20260508T170320Z-historical-hard-case-routing-analysis-c4a438e`
- `TEST-20260508T170615Z-spark-worker-toast-warning-slice`
- `TEST-20260508T171755Z-spark-routing-guard-broad-theme-task`
- `PATTERN-PROPOSAL-20260508T170332Z-pattern-accepted-theme-cascade-changes-require-s`
- `.codex/workflow/scenarios/model-routing.json` now includes Spark success, Spark failure/escalation, mixed strong-over-Spark cases, research-only routing, design review, integrated parallel review, and lead-only integration scenarios.

Second hardening pattern evidence:

- `PATTERN-PROPOSAL-20260509T065619Z-pattern-accepted-generated-workflow-guide-artifa`
- `PATTERN-PROPOSAL-20260509T065629Z-pattern-accepted-pattern-proposal-records-are-ap`

Visual-Zoo/hook/dependency hardening pattern evidence:

- `PATTERN-PROPOSAL-20260509T094319Z-pattern-accepted-production-design-zoo-uses-capt`
- `PATTERN-PROPOSAL-20260509T094331Z-pattern-accepted-dependency-audit-exceptions-mus`
- `PATTERN-PROPOSAL-20260509T110401Z-pattern-proposed-pattern-accepted-design-zoo-mus`
- `PATTERN-PROPOSAL-20260509T110413Z-pattern-proposed-pattern-accepted-visual-zoo-cap`

## Important Git Note

Plain `git` may misread this linked worktree if it resolves the submodule common git dir. The reliable command form is:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```

The earlier large dirty-tree report came from using the submodule common git dir directly and should not be treated as the current worktree state.

## Next Required Work

No migration-critical work is currently pending. Optional follow-ups remain tracked as risks:

- Confirm the server remains clean after future dependency installs; the cleaned `package-lock.json` diff backup is at `/root/monoWeb/deploy-backups/nexus/package-lock-local-20260509-before-final-clean.diff` and `.json`.
- Recheck the dependency audit baseline before 2026-06-09 and remove entries once `drizzle-kit` no longer carries the dev-only transitive advisory.
- Clean the non-failing React `act(...)` warning in `ThemeProvider.test.tsx`.
- Remember that Codex hooks are advisory gates unless the project `.codex/` layer is trusted/loaded; deterministic scripts remain the reliable enforcement path.
