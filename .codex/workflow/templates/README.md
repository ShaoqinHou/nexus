# Record Templates

These templates describe the expected content of durable workflow records. Prefer the workflow script commands because they add stable IDs and frontmatter, but use these shapes when writing or reviewing records by hand.

- `patch.md`: meaningful implementation slice.
- `review.md`: focused code/design/pattern review.
- `test.md`: command, browser, server, or historical-case verification.
- `guide-browser.md`: generated guide visual/browser validation.
- `pattern-proposal.md`: evidence-based durable-guidance candidate.
- `deployment.md`: server deployment or validation event.
- `current-state.md`: compact managed handover.
- `routing.md`: lead/worker model-routing and fallback decision.
- `audit.md`: workflow/project health audit.
- `project-bootstrap.md`: portable checklist for creating project-local Codex config, hooks, profile, policy, and workflow checks in another repo.

`current-state.md` is not a record transcript. It must stay small, link to detailed records, avoid self-staling finalization details, and pass `npm run workflow:handover-check`.
