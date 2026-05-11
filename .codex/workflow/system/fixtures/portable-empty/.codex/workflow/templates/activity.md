# Activity Record

Use the project wrapper `record-activity` command for long lead phases that timed commands do not explain.

Activity kind/status values and open-activity expiry are policy-owned in `.codex/workflow/policy/intake.json`. Open activity records can cover current active work only until `activity.maxOpenActivityMinutes`; final handover should prefer completed intervals. Use a public summary when generated guide views are public.
