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

Codex workflow migration is implemented and locally release-gated on branch `codex/native-workflow`. Commit, push, and final server deployment validation are still pending.

Implemented workflow pieces:

- `.codex/` workflow root with compact state, knowledge files, records, templates, research, scripts, hooks, agents, archived Claude material, and generated dashboard.
- `WORKFLOW.md` and `AGENTS.md` project entry points.
- Thin hook policy: hooks inject/invalidate/block/remind only; review, verification, audit, and pattern judgment stay in agents/skills/records.
- Dynamic pattern discovery: `record-pattern` creates evidence-based proposals before durable guidance is promoted.
- Dashboard/wiki/visualizer: `.codex/dashboard/index.html` summarizes state, records, gates, risks, deployment notes, and Design Zoo/Gym registry coverage.
- Active Claude workflow files are archived under `.codex/archive/claude-code-2026-05-09/`.
- Design-system continuation work: Toast now has semantic `info` styling, `warning` support, registry coverage, tests, and Design Zoo validation.

Latest gate records for current worktree hash `3fcb9e6e46c5b3ee`:

- `PATCH-20260508T174121Z-codex-native-workflow-migration-claude-workflow-`
- `REVIEW-20260508T174152Z-review-pass-worktree`
- `TEST-20260508T174152Z-verification-pass-worktree`
- `REVIEW-20260508T174152Z-audit-pass-worktree`

Latest validation records:

- `TEST-20260508T174135Z-full-local-validation-after-workflow-review-fixe`
- `TEST-20260508T174136Z-pretooluse-commit-hook-windows-command-matrix`
- `TEST-20260508T171614Z-reusable-design-zoo-validator`
- `TEST-20260508T171820Z-server-pre-deploy-validation`

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

- Regenerate `.codex/dashboard/index.html` after this state update.
- Commit and push `codex/native-workflow`.
- Deploy or otherwise validate the final branch on the server using the conventions in `.codex/knowledge/deployment.md`.
- Record deployment evidence under `.codex/workflow/records/deployments/`, update this file with the final commit/deployment result, and run the release gate again.
