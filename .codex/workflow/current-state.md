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

Codex workflow migration is implemented, locally release-gated, committed, pushed, and deployed for validation on branch `codex/native-workflow`.

Implemented workflow pieces:

- `.codex/` workflow root with compact state, knowledge files, records, templates, research, scripts, hooks, agents, archived Claude material, and generated dashboard.
- `WORKFLOW.md` and `AGENTS.md` project entry points.
- Thin hook policy: hooks inject/invalidate/block/remind only; review, verification, audit, and pattern judgment stay in agents/skills/records.
- Dynamic pattern discovery: `record-pattern` creates evidence-based proposals before durable guidance is promoted.
- Dashboard/wiki/visualizer: `.codex/dashboard/index.html` summarizes state, records, gates, risks, deployment notes, and Design Zoo/Gym registry coverage.
- Public-safe workflow guide: `https://cv.rehou.games/nexus/workflow/` generated from `.codex/dashboard/public.html`.
- Active Claude workflow files are archived under `.codex/archive/claude-code-2026-05-09/`.
- Design-system continuation work: Toast now has semantic `info` styling, `warning` support, registry coverage, tests, and Design Zoo validation.

Representative gate records from the workflow migration:

- `PATCH-20260508T174121Z-codex-native-workflow-migration-claude-workflow-`
- `REVIEW-20260508T174152Z-review-pass-worktree`
- `TEST-20260508T174152Z-verification-pass-worktree`
- `REVIEW-20260508T174152Z-audit-pass-worktree`

Latest validation records:

- `TEST-20260508T174135Z-full-local-validation-after-workflow-review-fixe`
- `TEST-20260508T174136Z-pretooluse-commit-hook-windows-command-matrix`
- `TEST-20260508T171614Z-reusable-design-zoo-validator`
- `TEST-20260508T171820Z-server-pre-deploy-validation`

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
- Public guide deployment: `https://cv.rehou.games/nexus/workflow/` should return 200 after `.codex/dashboard/public.html` is copied to the static workflow path.
- Preserved server dirty state: pre-existing `package-lock.json` modification remains and was backed up to `/root/monoWeb/deploy-backups/nexus/package-lock-local-20260509-codex-native-workflow.diff`.

Historical/model-routing evidence:

- `TEST-20260508T170320Z-historical-hard-case-routing-analysis-c4a438e`
- `TEST-20260508T170615Z-spark-worker-toast-warning-slice`
- `TEST-20260508T171755Z-spark-routing-guard-broad-theme-task`
- `PATTERN-PROPOSAL-20260508T170332Z-pattern-accepted-theme-cascade-changes-require-s`

## Important Git Note

Plain `git` may misread this linked worktree if it resolves the submodule common git dir. The reliable command form is:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```

The earlier large dirty-tree report came from using the submodule common git dir directly and should not be treated as the current worktree state.

## Next Required Work

No mandatory migration step remains. Optional follow-ups are tracked as risks:

- Decide whether to clean or adopt the server's pre-existing dirty `package-lock.json`.
- Triage pre-existing `npm audit` findings from server `npm ci`.
- Clean the non-failing React `act(...)` warning in `ThemeProvider.test.tsx`.
- Remember that Codex hooks are advisory gates unless the project `.codex/` layer is trusted/loaded; deterministic scripts remain the reliable enforcement path.
