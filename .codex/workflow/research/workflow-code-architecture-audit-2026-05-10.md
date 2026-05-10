# Workflow Code Architecture Audit

Date: 2026-05-10

Work slice: `WORK-SLICE-20260510T151217Z-work-slice-active-final-code-level-workflow-arch`

## Purpose

Audit the actual Codex workflow implementation for design drift, duplicated mechanisms, hidden Nexus assumptions, and patch-on-patch fixes. This audit reviewed the workflow scripts and policy code paths, not only the documentation architecture.

## Inputs Reviewed

- `.codex/scripts/workflow-engine.mjs`
- `.codex/scripts/nexus-workflow.mjs`
- `.codex/scripts/run-hook.mjs`
- `.codex/hooks.json`
- `.codex/config.toml`
- `package.json`
- `.codex/workflow/profile.json`
- `.codex/workflow/policy/*.json`
- `.codex/workflow/templates/*.md`
- `.codex/knowledge/*.md`
- `.agents/skills/nexus-*/SKILL.md`
- `AGENTS.md`
- `WORKFLOW.md`

Parallel read-only reviewers inspected the same area from three angles: workflow implementation architecture, pattern consistency, and portability to a second project.

## Architecture That Held

- Hooks remain thin triggers. `.codex/hooks.json` invokes only `.codex/scripts/run-hook.mjs`, and the hook logic forwards to the deterministic wrapper instead of embedding review or project judgment.
- The operator route is centralized as `status -> health -> release-gate -> deployed-gate`; helper commands diagnose failures or create records instead of acting as a separate closeout checklist.
- Work Intake is part of the deterministic record system. User intent, lead work slices, patches, reviews, verification, audit, and deployment evidence are linked and checked by `work-intake-check`.
- Branch closeout is evidence-based. Branch-scope records are tied to a branch evidence hash, and delegated worker evidence requires routing plus integrated review.
- Command evidence is not just prose. Passing verify, audit, and deployment records can cite timed command IDs, and gates reject missing, failed, timed-out, or malformed command evidence.
- Generated dashboard/public/Zoo guide files are views. They are useful navigation surfaces but remain delete-safe snapshots governed by guide freshness and browser-evidence gates.

## Design Drift Found And Fixed

### Core Paths Were Declared In Profile But Hardcoded In Wrapper

Issue: `profile.json` declared `records`, `state`, and `runtime`, but `nexus-workflow.mjs` also hardcoded those paths.

Fix: `nexus-workflow.mjs` now resolves `RECORDS`, `STATE_DIR`, `RUNTIME_DIR`, dashboard paths, Zoo guide paths, and routing scenarios through `PROFILE.paths` or explicit policy fields.

Why it matters: another project can change profile paths without discovering hidden hardcoded directories in the wrapper.

### Record Schemas, Prefixes, And Base Env Names Were Partly Script-Owned

Issue: record schemas had policy data, but the wrapper still contained fallback schema/prefix behavior and hardcoded Nexus base env names.

Fix: `records.json` now owns `prefixByKind`, `schemaByKind`, and `baseEnv`. The wrapper fails closed if schema/prefix policy is missing.

Why it matters: record identity is workflow data, not script behavior. Failing closed prevents a future project from silently generating `nexus-*` record schemas.

### Policy Checks Restated Policy-Owned Guide Inputs

Issue: `guide.json` declared guide source inputs, but `policy-check` still hardcoded a second required subset in `nexus-workflow.mjs`.

Fix: `guide.json` now owns `requiredSourceFiles`; `policy-check` validates that policy-owned list against `publicGuideInputFiles()`.

Why it matters: changing guide hash membership is now one policy edit instead of a policy edit plus matching script edit.

### Classifier Fixtures Lived In Script Code

Issue: file-classifier fixtures were embedded in `nexus-workflow.mjs`, so the policy pack did not fully own its test cases.

Fix: `files.json` now owns `classifierTestCases`; `policyClassifierProblems()` reads fixtures from policy.

Why it matters: file classification is project data. Moving fixtures into policy makes classifier behavior inspectable and portable.

### Guide Topology And Document Lists Were Still Partly Hardcoded

Issue: public guide generation already had `guide.viewGraphs`, but the generator still constructed Nexus topology fallbacks and a hardcoded document list.

Fix: `guide.json` now owns `viewGraphs.workflow`, `documentFiles`, and `documentDirectories`; `guidePolicyGraph()` fails if required graph policy is missing.

Why it matters: the generator is closer to a renderer; project topology now lives in policy where future projects know to change it.

### Template Guidance Still Promoted A Helper Check As A Closeout Step

Issue: templates mentioned `workflow:handover-check` alongside `workflow:release-gate`, which weakened the single canonical ladder.

Fix: templates now say `workflow:release-gate` is the final local handover gate and `workflow:handover-check` is diagnostic-only.

Why it matters: future agents should not grow a parallel handover checklist.

## Current Residual Boundary

`workflow-engine.mjs` is reusable: root discovery, strict profile/policy loading, path matching, and TOML helpers are generic.

`nexus-workflow.mjs` is still the Nexus deterministic wrapper. It contains the record commands, gate orchestration, guide rendering, Work Intake checks, routing checks, branch evidence checks, and Nexus display language. That is acceptable for this project, but it should not be marketed as a fully generic engine yet.

For the second project, copy the profile/policy shape and the wrapper pattern, then extract more shared code only after behavior matches in both projects. The next likely extraction candidates are:

- record writing and frontmatter parsing,
- branch evidence hashing,
- command-run telemetry,
- Work Intake graph/check logic,
- guide artifact hashing and browser-evidence checks.

Do not extract them only because they look reusable; extract them after the second implementation proves the same abstractions.

## Verification Run During This Audit

Passed locally after the fixes:

- `node --check .codex/scripts/nexus-workflow.mjs`
- `node --check .codex/scripts/workflow-engine.mjs`
- policy JSON parse check
- `npm run workflow:self-test`
- `npm run workflow:policy-check`
- `npm run workflow:inventory-check`
- `npm run workflow:work-intake-check`
- `npm run workflow:trace-check`

Expected in-flight failures remain until final closeout records and regenerated guide evidence are produced:

- branch evidence is not complete until branch-scope patch/review/verify/audit records are recorded.
- guide browser evidence will be stale until records settle and `workflow:guide-browser-finalize` runs.

## Final Judgment

The latest fixes address real architecture drift rather than adding another patch layer: policy now owns the main project-specific classifier, guide, record identity, and topology contracts. The remaining project-specific wrapper boundary is intentional and documented so future portability work does not confuse "profile/policy extracted" with "fully generic workflow framework."

## Final Follow-Up Audit

After the user explicitly asked for an end-of-work audit of the actual workflow codebase, existing read-only reviewer agents re-checked the current implementation from workflow-architecture, pattern, and portability angles.

Findings:

- no release-blocking architecture drift remained,
- one low portability smell remained: public-guide redaction checks, Zoo/Gym visual required strings, and Zoo/Gym browser artifact title expectations were still partly script-owned,
- the smell was fixed by moving those project facts into `.codex/workflow/policy/guide.json` and `.codex/workflow/policy/design.json`, leaving `.codex/scripts/nexus-workflow.mjs` as the deterministic enforcer.

Verification after that fix:

- `node --check .codex/scripts/nexus-workflow.mjs`
- `node --check .codex/scripts/workflow-engine.mjs`
- `final-policy-check-after-redaction-policy-20260510T1555Z`
- `final-self-test-after-redaction-policy-20260510T1555Z`

Residual boundary remains unchanged: the reusable core is still `workflow-engine.mjs` plus profile/policy loading. `nexus-workflow.mjs` remains a Nexus wrapper until a second project proves which larger pieces should be extracted.
