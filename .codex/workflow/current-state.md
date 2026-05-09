# Current State

Updated: 2026-05-10

## Original Request

The user asked for a real Codex-native adaptation of the old Claude Code workflow, not a rename. The preserved brief is:

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

Harden the Codex-native workflow around a simpler proof model:

- records plus git/worktree/branch state are truth,
- `.codex/workflow/state/` is delete-safe cache,
- `.codex/workflow/runtime/` is local telemetry,
- generated guide/dashboard/Zoo surfaces are views,
- `status` is a cheap resume snapshot,
- `health`, `release-gate`, and `deployed-gate` are the heavier proof gates,
- branch hashes live on branch-scope closing records,
- delegated worker proof is explicit routing, worker patch, routing closeout, and integrated review.

## Current Phase

Workflow simplification and boundary hardening are implemented and should be judged by the workflow records plus gates, not this compact note. The current pass has:

- moved mutable state JSON out of `.codex/workflow/records/`,
- made status cheap and added `workflow:health`,
- added timed command telemetry under runtime,
- embedded compact command-run summaries into passing verify/audit/deployment records so gates validate durable command evidence instead of mutable telemetry,
- added branch-scope evidence and branch-introduced delegated-worker checks,
- added enforced delegated-worker routing closeout,
- collapsed the operator-facing route to one ladder: `status -> health -> release-gate -> deployed-gate`,
- made generated guide/Zoo artifacts trigger the relevant gates even though they remain non-substantive generated views,
- made guide-browser records embed screenshot and summary hashes so mutable artifact files cannot silently rewrite a pass,
- canonicalized text content hashing for worktree/branch evidence so Windows and Linux release gates compute the same branch hash,
- separated local release readiness from deployment evidence,
- made the visual Zoo/Gym capture fail closed when requested theme or mode is not reflected in the DOM,
- regenerated the dashboard/public guide/Zoo guide from the current workflow and design-system records.

## How To Resume

1. Read `.codex/README.md`.
2. Run `npm run workflow:status`.
3. Inspect detailed evidence under `.codex/workflow/records/` only when needed.
4. Use `npm run workflow:health` for diagnostics and `npm run workflow:release-gate` before local release handover.
5. Use `npm run workflow:deployed-gate` after server validation when deployment is in scope.

Branch closeout uses branch-scope patch, review, verification, and audit records tied to the current branch hash. Worktree-scope records are useful during coding, but the release gate expects branch-scope closeout records when the branch has a substantive diff.

## Important Git Note

Plain `git` may misread this linked worktree if it resolves the submodule common git dir. The reliable command form is:

```bash
git --git-dir=C:/Users/housh/Documents/monoWeb/.git/modules/nexus/worktrees/nexus --work-tree=C:/Users/housh/.codex/worktrees/7514/nexus status --short --branch
```

## Detailed Evidence

Use the generated guide and append-only records instead of this compact handover for history:

- public workflow guide: `https://cv.rehou.games/nexus/workflow/`
- visual Zoo/Gym guide: `https://cv.rehou.games/nexus/workflow/zoo/`
- local generated dashboard: `.codex/dashboard/index.html`
- records: `.codex/workflow/records/`
- risks: `.codex/workflow/records/risks.md`

## Open Risks

- Check the latest branch-scope patch/review/verification/audit records and release/deployed gates for final closeout status.
- Check deployment records for the latest server validation target and command evidence.
- Recheck dependency audit baseline before 2026-06-09.
- Clean the non-failing React `act(...)` warning in `ThemeProvider.test.tsx`.
