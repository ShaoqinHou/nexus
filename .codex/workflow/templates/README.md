# Record Templates

These templates describe the expected human-readable body of durable workflow records. Prefer the workflow script commands because they add stable IDs, frontmatter, hash-bound evidence, worktree/branch hashes, and policy-owned schema fields.

Do not treat a hand-written template body as a valid gate record unless the frontmatter matches the active policy schema. For passing verification, audit, deployment, and guide-browser records, use the script commands so command summaries and artifact hashes are embedded correctly.

- `patch.md`: meaningful implementation slice.
- `intent.md`: compact user-intent slice captured from a durable prompt meaning.
- `work-slice.md`: lead-interpreted implementable slice linked to intents and evidence.
- `activity.md`: compact long-phase progress or wait interval linked to a work slice.
- `review.md`: focused code/design/pattern review.
- `test.md`: command, browser, server, or historical-case verification.
- `guide-browser.md`: generated guide visual/browser validation.
- `pattern-proposal.md`: evidence-based durable-guidance candidate.
- `deployment.md`: server deployment or validation event.
- `current-state.md`: compact managed handover.
- `routing.md`: lead/worker model-routing and fallback decision.
- `audit.md`: workflow/project health audit.
- `project-bootstrap.md`: portable checklist for creating project-local Codex config, hooks, profile, policy, and workflow checks in another repo.

Before using `project-bootstrap.md`, read `.codex/workflow/principles.md` and `.codex/workflow/capabilities.md`. Those documents explain the workflow's single-source-of-truth model, where project-specific data belongs, which capabilities are optional, and which Nexus files must not be copied as live evidence.

`current-state.md` is not a record transcript. It must stay small, link to detailed records, avoid self-staling finalization details, and pass the canonical `npm run workflow:release-gate`; use `npm run workflow:handover-check` only as a diagnostic helper.
