# Model Routing

This file is the durable source of truth for lead/worker routing in Nexus. It exists because the workflow must not quietly route every coding task to the same model, and Spark must not be asked to solve tasks that require broad judgment.

## Lead Preflight

Before delegating implementation, the lead classifies the task:

- **Spark allowed**: narrow file ownership, explicit expected behavior, low ambiguity, no architecture choice, no visual/design judgment, no deployment coupling, and a known targeted verification command.
- **Strong worker required**: ambiguous debugging, architecture or API contract changes, cross-cutting refactors, theme cascade, tenant isolation, routing/basepath, deployment/server behavior, visual validation, accessibility judgment, schema/data migration, or missing/unclear tests.
- **Lead only**: tasks that are too tightly coupled to current conversation context, require immediate integration decisions, or would create coordination risk if delegated.

The lead should record representative routing decisions as tests or pattern proposals when a task teaches a durable lesson.

For delegated implementation, record a compact routing preflight when the decision is not trivial:

```bash
node .codex/scripts/nexus-workflow.mjs record-routing --summary "<task>" --route <route> --worker <agent> --files "a,b" --verification "<commands>" --fallback-trigger "<when>" --fallback-target "<agent>"
```

The preflight is bookkeeping, not bureaucracy. It gives the lead a durable place to state why Spark is allowed, why a strong worker is required, or why the lead should keep the task local. Use `.codex/workflow/templates/routing.md` for detailed routing records.

When a delegated worker edits files, the patch record must include the worker name and routing id:

```bash
node .codex/scripts/nexus-workflow.mjs record-patch --summary "<slice>" --worker <agent> --routing <ROUTING-id> --files "a,b"
```

The routing gate uses that attribution to require routing coverage and integrated review. If worker identity collapses to `codex-lead`, the workflow cannot prove a delegated/parallel path actually happened.

Branch release gates also scan patch records introduced on the branch. A delegated worker patch still requires routing proof and integrated review even if later lead edits change the final branch hash and make the worker patch's original worktree hash stale.

Close a routing slice as soon as the worker output has been recorded:

```bash
node .codex/scripts/nexus-workflow.mjs complete-routing --routing <ROUTING-id> --notes "<outcome>"
```

Hooks do not infer worker identity from Codex subagents. Delegation proof comes from explicit `record-routing`, `record-patch --worker --routing`, and `complete-routing` records. If an active routing record covers the changed files, `record-patch` inherits its worker, routing id, and work-slice ids when the lead forgets those flags; without a routing preflight the kernel cannot observe hidden subagent provenance.

Branch and release gates enforce the whole chain for delegated worker patches introduced on the branch: routing preflight, worker patch attribution, routing closeout, and integrated review. If any one part is missing, the branch is not release-ready.

## Spark Worker Contract

Spark is a fast coding worker, not the default coding worker.

Spark may edit only after it confirms the task fits the Spark-allowed criteria. If the assignment is too broad or missing verification, Spark must return `ESCALATE` without editing.

Spark must stop and return `ESCALATE` when:

- tests fail and the fix is not obvious within one tight iteration,
- it needs to change files outside the assigned write scope,
- it has to infer architecture or project policy,
- it needs visual/design judgment,
- it is not making progress after roughly 10-15 minutes of task time,
- it discovers a coupled route/theme/tenant/deployment concern.

Escalation output should include files read, files changed, commands run, current failure, and the smallest suggested next step.

The lead must also enforce the fallback. If a Spark worker hangs, loops, or fails to return usable output within the assigned timebox, the lead closes/stops that worker and reassigns the slice to a strong worker or handles it locally. Do not wait indefinitely for Spark to self-diagnose.

When Spark escalates after editing, create a routing or patch record that says what changed, why Spark stopped, and who owns the takeover. The fallback owner should be explicit, usually `nexus_strong_worker` or `lead`. This prevents a failed worker slice from disappearing into chat history.

## Strong Worker Contract

The strong worker is a normal implementation worker for hard code, not only a reviewer.

Use the strong worker for:

- Spark fallback,
- hard debugging,
- cross-cutting product changes,
- design-system and theme cascade work,
- deployment or server-environment fixes,
- changes where related files must be discovered and updated together,
- tasks where weak context could cause a project-pattern violation.

Strong workers can expand scope only when they identify a required coupled change, and they must report that expansion.

## Review Routing

Implementation routing does not replace focused review.

- Pattern-sensitive code changes get `nexus_pattern_reviewer` or equivalent focused review.
- Visual/design-system changes get `nexus_design_reviewer` or equivalent focused review plus browser/design-zoo evidence.
- Large workflow changes require audit evidence, not only tests.
- Parallel worker changes require a final integrated review of the merged worktree hash, even if each worker reported a local review. Worker-local review can miss cross-slice conflicts. Record it with `record-review --kind integrated`.
- Verification and audit may be done by the lead, dedicated verifier/auditor agents, or the `nexus-verify` / `nexus-audit` skills, but the evidence must be recorded with `record-verify` and `record-audit`.

## Evidence

- `TEST-20260508T170615Z-spark-worker-toast-warning-slice`: Spark succeeded on a narrow Toast warning slice.
- `TEST-20260508T171755Z-spark-routing-guard-broad-theme-task`: Spark refused/escalated a broad theme cascade task.
- `TEST-20260508T170320Z-historical-hard-case-routing-analysis-c4a438e`: a hard theme cascade historical case was routed to a stronger model/reviewer.
- `PATTERN-PROPOSAL-20260508T170332Z-pattern-accepted-theme-cascade-changes-require-s`: theme cascade requires strong-model review and portal evidence.
- `.codex/workflow/scenarios/model-routing.json`: executable synthetic routing cases for Spark success, Spark failure/escalation, strong-worker tasks, research-only work, design review, and integrated parallel review.

## Coverage Note

The workflow has representative positive and negative routing evidence. It does not claim every possible failure mode has been empirically exhausted. The durable control is the preflight criteria plus lead-enforced fallback, not a belief that Spark will always self-police perfectly.

Synthetic routing tests deliberately include fabricated situations that are not tied to one Nexus feature. They test the workflow's decision logic and fallback rules. Real historical cases still matter for project-specific pattern validation.
