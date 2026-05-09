# Workflow Portability And Final Design Audit

Date: 2026-05-10

This report captures the final workflow-only audit requested after the Nexus Codex workflow migration. It is not a replacement for the append-only patch/review/verification/audit records; it is a compact design assessment for future humans and agents. Durable proof for this pass must come from the branch-scope records created after the final fixes, not from this report alone.

## Executive Conclusion

The Nexus workflow is ready as a project-local Codex workflow after the final audit fixes in this pass:

- canonical workflow knowledge now includes `.codex/knowledge/verification.md` in deterministic required-file and public-guide source-hash inputs;
- `workflow:status` is now a cheap resume snapshot backed by cache/current worktree state, while record-history and full integrity checks stay in `workflow:health`, `workflow:release-gate`, and `workflow:deployed-gate`;
- workflow research reports are included in public-guide source hashing so guide freshness tracks durable workflow analysis;
- deployment guidance now requires public Zoo/Gym screenshot image-load validation, not only HTML/JPEG-reference checks.

The workflow is reusable as an architectural pattern, but it is not a drop-in generic package yet. The generic parts and Nexus policy pack are still mixed in `.codex/scripts/nexus-workflow.mjs`.

## Directly Reusable For Similar Webapps

- Canonical ladder: `workflow:status -> workflow:health -> workflow:release-gate -> workflow:deployed-gate`.
- Deterministic kernel as the enforcement center, with hooks as thin triggers only.
- Append-only records for patches, reviews, verification, audits, routing, pattern proposals, deployments, and guide-browser proof.
- Compact `current-state.md` handover plus detailed linked records.
- Timed command runner with pass/fail/timeout summaries embedded into durable records.
- Branch-scope closeout records tied to a branch evidence hash.
- Lead/worker routing model with Spark allowed only for narrow, explicit, testable slices and strong-worker escalation for ambiguous or cross-cutting work.
- Dynamic pattern discovery through proposal records before durable guidance promotion.
- Generated guide/dashboard as a navigable view over records, docs, graphs, routing scenarios, and visual evidence.
- Local and server/deployment readiness split into separate gates.

## Needs Project-Specific Adaptation

- Package roots, app type, build/test commands, and CI commands.
- Deployment target, public base path, service name, SSH/server conventions, and health checks.
- Review-kind classifiers and project invariants.
- Design-system token rules, registry shape, Zoo/Gym route names, and screenshot capture contexts.
- Routing scenarios and fallback examples.
- Public-guide sections and graph nodes.
- Dependency audit baseline rules and expiry policy.

## Nexus-Specific, Do Not Reuse Unchanged

- Tenant isolation rules, restaurant ordering domain rules, `CartProvider`, `MerchantThemeShell`, `DietaryIcon`, cuisine theme names, and five-locale i18n requirements.
- `design/reference/v1/nexus-design-system` source-of-truth paths.
- `/nexus/` base path, `cv.rehou.games` deployment URLs, server paths, and `nexus-api` service.
- Production `/design` exclusion and the exact visual Zoo/Gym screenshot gallery pipeline.
- Current record IDs, command IDs, server evidence, and historical branch hashes.

## Role-Play Results

### Generic Vite React App

Good fit for the core ladder, records, branch evidence, guide, and browser evidence. It likely needs a smaller UI gallery or browser-smoke guide instead of the full Nexus restaurant-themed Zoo/Gym. Deployment and API checks should be replaced with the app's real hosting path and health signal.

### Next.js SaaS Dashboard

Good fit for append-only records, review/verify/audit gates, model routing, branch closeout, and public guide generation. Needs adaptation for SSR/build output, Next `basePath`, API route deployment, and framework-specific smoke checks. Visual-guide support should be optional or mapped to Storybook/component routes if present.

### API-Heavy Multi-Tenant App

Strongest fit for the branch evidence, pattern guidance, audit, and tenant-invariant model. UI Zoo/Gym can be replaced by API contract/OpenAPI checks, migration checks, and tenant-isolation fixtures. Strong-worker routing should remain default for auth, tenancy, migrations, and ambiguous production issues.

### Small Library Or CLI Tool

The full dashboard/Zoo layer would be too heavy. Reuse timed command evidence, append-only records, release gates, dependency audit policy, and pattern proposals. Replace browser/visual proof with examples, fixtures, docs build, package publish dry-runs, and compatibility matrices.

### Multi-Repo Product

Core pattern still applies, but branch evidence must be repo-aware. A future extraction should support a repo profile that declares worktree roots, package roots, generated artifacts, and deployment surfaces per repo.

## Design Quality Assessment

The workflow is no longer a stack of ad hoc reminders. It has one deterministic kernel, one canonical ladder, one evidence root, one generated guide, and explicit boundaries between:

- durable truth: git state plus append-only records;
- mutable cache: `.codex/workflow/state`;
- runtime telemetry: `.codex/workflow/runtime`;
- generated views: `.codex/dashboard`;
- agent judgment: review/verify/audit/routing records.

The main remaining design limitation is portability, not Nexus readiness. The next major improvement would be to split the generic workflow engine from a Nexus policy pack and repo profile.

## Remaining Non-Blocking Improvements

- Extract a generic workflow kernel plus project profile when a second project adopts this system.
- Make guide sections optional/data-driven instead of assuming records, design system, and Zoo/Gym all exist.
- Add a reusable deployed-browser/image-load check command for workflow guide publishing instead of relying on one-off Node snippets.
- Add public-safe search/filtering to the guide timeline if project history grows dense.
- Add targeted all-theme visual captures only when a change affects theme-specific behavior outside the current default capture contexts.

## Interim Command Runs From This Pass

These command IDs were generated by the timed workflow runner while auditing and fixing the workflow. They are operational telemetry until embedded into durable verification, audit, guide-browser, or deployment records.

- `final-workflow-audit-health`: `workflow:health` passed before the final fixes.
- `final-workflow-audit-self-test`: workflow self-test passed before the final fixes.
- `final-workflow-audit-routing-scenarios`: 15 routing scenarios passed before the final fixes.
- `final-workflow-audit-release-gate`: local release gate passed before the final fixes.
- `final-workflow-audit-deployed-gate`: deployment gate passed before the final fixes.
- `final-audit-fix-self-test`: workflow self-test passed after the final fixes.
- `final-audit-fix-routing-scenarios`: 15 routing scenarios passed after the final fixes.

After this report and the final kernel fixes, new branch-scope records and gates must be recorded again before closeout. Those records are the durable evidence for the final state.
