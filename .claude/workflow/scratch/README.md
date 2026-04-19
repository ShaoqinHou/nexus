# Scratch

Ephemeral outputs from the commit-review loop. Files here are append-only artifacts, not source of truth.

## Layout

- `review-<sha>.md` — reviewer agent findings report (schema: review-report/v1)
- `fix-log-<sha>.md` — fixer agent fix log (schema: fix-log/v1)
- `review-outcome-<sha>.md` — per-sha outcome (schema: review-outcome/v1)
- `dispute-<sha>.md` — (future) arbiter ruling (schema: dispute-ruling/v1)
- `pending-review.txt` — trigger marker from the hook
- `review-queue.txt` — FIFO queue of shas awaiting review
- `review-pause` — (opt-in) presence pauses the background driver
- `hook-trace.log` — diagnostic trace from the commit-review hook
- `review-driver-*.log` — background driver stdout/stderr
- `.review.lock/` — lockdir held by the active driver (auto-cleared after 8 min)
- `.phase-in-flight` — (opt-in) parent-set lock that suppresses the review hook during long phase work
- `last-review-summary.md` — batch-summary after each drain-queue run

## Retention

Reports accumulate indefinitely. Archive to `.claude/workflow/archive/<YYYY-MM>/` when the scratch dir gets noisy — typically every few months.
