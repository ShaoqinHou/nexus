# Workflow Principles And Map

This document is the base design for the Codex workflow. It explains why the system exists, where each responsibility lives, and what must be copied, rewritten, or discarded when the workflow is moved to another project.

Read this before porting the workflow or auditing whether a workflow change is architectural or just a patch.

## Purpose

The workflow exists to help a solo developer use LLM agents for long-running project work without losing intent, mixing incompatible code patterns, skipping review, or trusting a chat transcript as project memory.

It is not a project-management ceremony. It is a small deterministic system that gives non-deterministic LLM work a reliable execution path:

`user intent -> lead work slice -> patch -> focused review -> verification -> audit -> deployment when needed`

The LLM supplies judgment. The workflow records that judgment and checks that required evidence exists.

## Core Principles

1. Records are truth.
   Durable project state lives in append-only records under `.codex/workflow/records/` plus git branch/worktree state. Chat, generated guides, mutable cache, and screenshots are not the source of truth.

2. There is one deterministic kernel.
   Workflow enforcement should route through the project wrapper, currently `.codex/scripts/nexus-workflow.mjs`, and the reusable loader `.codex/scripts/workflow-engine.mjs`. Do not create parallel closeout checklists that duplicate gate logic.

3. Project facts live in policy, profile, and knowledge.
   Paths, file classifiers, record schemas, guide contracts, deployment URLs, design-system inputs, hook expectations, and routing scenarios belong in `.codex/workflow/profile.json` and `.codex/workflow/policy/*.json` first. Project patterns and invariants belong in `.codex/knowledge/`.

4. Hooks are thin triggers.
   Hooks can remind, invalidate, or block obvious unsafe actions. They must not contain LLM review logic, project judgment, or long checklists. Judgment belongs in reviews, audits, verification records, skills, and knowledge files.

5. Generated views are delete-safe aids.
   `.codex/dashboard/`, public workflow guides, and Zoo/Gym guide pages help humans inspect the workflow. They are generated views over records, policy, and knowledge. Gates use hashes and browser evidence to prove freshness, but generated HTML is still not canonical memory.

6. Work Intake protects user intent.
   User prompts are captured as compact intent records, then converted into lead-owned work slices. Later bug reports, vague feature ideas, and corrections should update or supersede work slices instead of creating random one-off notes.

7. Review, verify, and audit are automatic workflow obligations.
   They are not only actions taken when the user asks. Substantive changes need focused review records, command or artifact-backed verification records, and audit records when policy requires them.

8. Pattern guidance is evidence-based.
   If an agent finds a repeated mistake, undocumented invariant, deprecated approach, or useful convention, it creates a pattern proposal first. Durable guidance changes only after the source code, tests, history, or reference docs support it.

9. Model routing is explicit.
   Fast workers are allowed only for narrow, heavily guided work with clear scope and tests. Ambiguous debugging, architecture, visual/design judgment, deployment, and cross-cutting changes stay with a strong model or the lead.

10. Portability means replacing project data, not pretending Nexus facts are generic.
    The workflow shape can be copied. Nexus app paths, design-system details, deployment URLs, tenant rules, package scripts, and historical records must be rewritten or discarded for the target project.

## Responsibility Map

| Area | Role | Porting rule |
| --- | --- | --- |
| `AGENTS.md` | Codex session instructions and project hard rules | Copy shape, rewrite project identity, stack, hard rules, command names, and agent names. |
| `WORKFLOW.md` | Human-facing root pointer | Copy shape, rewrite as the shortest "start here" for the target project. |
| `.codex/README.md` | Detailed workflow entry point | Copy shape, rewrite project-specific sections and links. |
| `.codex/workflow/principles.md` | Base design and portability map | Copy, then adjust only if the target workflow intentionally changes principles. |
| `.codex/scripts/workflow-engine.mjs` | Reusable loader, path policy, sanitizer, and matching helpers | Copy as reusable system code unless the second project proves an engine change is needed. |
| `.codex/scripts/nexus-workflow.mjs` | Nexus wrapper and deterministic kernel surface | Copy as starting point, rename to `<project>-workflow.mjs`, then remove or adapt Nexus-specific behavior. |
| `.codex/scripts/run-hook.mjs` | Thin hook dispatcher | Copy and point it at the target wrapper through profile data. |
| `.codex/workflow/profile.json` | Project identity, root paths, env names, generated surface paths | Rewrite for the target project. |
| `.codex/workflow/policy/*.json` | Project-specific rules consumed by gates | Rewrite first. Do not hardcode target-project facts in scripts until policy cannot express them. |
| `.codex/knowledge/*.md` | Durable project patterns and operational knowledge | Rewrite. Do not carry Nexus design/deployment facts as live truth. |
| `.codex/workflow/templates/*.md` | Record shapes and bootstrap guidance | Copy, then rename command examples and project-specific names. |
| `.codex/workflow/scenarios/*.json` | Routing and failure scenarios | Replace with target-project examples. |
| `.codex/agents/*.toml` and `.agents/skills/*` | Project-scoped agent and skill guidance | Copy shape, rename roles, rewrite project facts and command names. |
| `.codex/hooks.json` and `.codex/config.toml` | Trusted Codex session integration | Copy only after deciding target project permissions and hook needs. |
| `.github/workflows/*` | Optional CI gate enforcement | Copy only if the target project uses GitHub CI, then rewrite package scripts and branch assumptions. |
| `.codex/workflow/records/*` | Append-only Nexus evidence | Do not copy as live records. Start fresh in the target project. |
| `.codex/workflow/current-state.md` | Compact Nexus handover | Do not copy as live state. Create a new current-state from the target project. |
| `.codex/workflow/research/*` | Historical Nexus audits and decisions | Keep in Nexus. For another project, copy only selected files into an archive/reference folder if they help explain the migration. |
| `.codex/dashboard/*` | Generated Nexus views and visual artifacts | Do not copy as truth. Regenerate in the target project after policy/profile are adapted. |
| `.codex/workflow/artifacts/*` | Bounded screenshots and summaries referenced by records or generated visual guides | Do not copy as truth. Keep only policy-approved, record-linked evidence or regenerated artifacts. |
| `.codex/workflow/state/*` and `.codex/workflow/runtime/*` | Mutable local cache and telemetry | Do not copy except `.gitignore` placeholders. |

## Workflow File Roles

The machine-owned role taxonomy lives in `.codex/workflow/policy/files.json` under `inventory.roleTaxonomy`. It is the source of truth for whether a workflow path is system code, project policy/profile data, append-only evidence, generated artifact, mutable cache, or workflow documentation.

Use these groups when deciding what to open, edit, copy, or discard:

| Group | Examples | Read/Edit Rule |
| --- | --- | --- |
| System code | `.codex/scripts/workflow-engine.mjs`, project wrapper, hook dispatcher | Edit only for deterministic behavior. Project-specific facts should move to profile/policy first. |
| Project policy/profile data | `.codex/workflow/profile.json`, `.codex/workflow/policy/*.json`, dependency audit baseline | Machine-consumed. Prefer compact JSON facts, enums, path lists, and gate contracts over prose duplication. |
| Workflow design/reference docs | `principles.md`, `capabilities.md`, `templates/*` | Explain intent and usage. These are useful but stale-prone, so they should point at policy owners instead of repeating enums or path lists. |
| Managed handover | `current-state.md` | Compact resume state only. It must not become a changelog or transcript. |
| Append-only evidence | `records/*` | One event per file. Preserve frontmatter for gates; keep the body concise and link to artifacts or command ids for detail. |
| Historical analysis | `research/*`, `briefs/*` | Open by title when needed. Do not bulk-load as current truth. |
| Generated views/artifacts | `.codex/dashboard/*`, `workflow/artifacts/*` | Human inspection aids and evidence attachments. Regenerate or validate; do not edit as canonical memory. |
| Mutable telemetry/cache | `state/*`, `runtime/*` | Delete-safe diagnostics only. Passing records can embed compact summaries from telemetry, but telemetry itself is not durable proof. |

When a new directory or root workflow file is added, update `inventory.roleTaxonomy` and run `npm run workflow:policy-check` plus `npm run workflow:inventory-check`.

## Data Shape

Workflow data should be optimized for an LLM to resume with the smallest useful context:

- Put searchable identifiers, status, hashes, links, and compact summaries in frontmatter.
- Put narrative judgment in the markdown body, but avoid replaying every related file, command, or transcript when a reference is enough.
- Preserve large details in the owner record or artifact. For branch closeout, the branch patch record owns the complete branch file list; branch review, verification, audit, and deployment records should reference the branch hash and patch instead of copying the full diff again.
- Keep generated indexes and guides as views over records and policy. If a generated view is stale, fix the records, policy, or generator.
- Keep research reports curated. A new research note should be linked from a record, a knowledge file, or the compact handover only when it remains relevant.

This follows the same split used in established documentation and provenance systems: reference data stays structured and compact, event evidence is append-only, and explanatory docs are separate from machine-enforced policy.

## Where Humans Should Start

1. Read `WORKFLOW.md` for the short entry point.
2. Read this file for the workflow design and portability rules.
3. Read `.codex/README.md` for the operational guide.
4. Read `.codex/workflow/current-state.md` for current project state.
5. Open `.codex/dashboard/index.html` only after it has been regenerated; treat it as a view, not the source of truth.

For a second project, start from `.codex/workflow/templates/project-bootstrap.md` after reading this file.

## Where Agents Should Start

For normal project work:

1. `AGENTS.md`
2. `.codex/README.md`
3. `.codex/workflow/current-state.md`
4. The closest relevant file under `.codex/knowledge/`
5. `npm run workflow:status`

For workflow migration, architecture changes, or second-project setup:

1. `AGENTS.md`
2. `.codex/workflow/principles.md`
3. `.codex/workflow/templates/project-bootstrap.md`
4. `.codex/workflow/research/workflow-engine-profile-extraction-2026-05-10.md`
5. `npm run workflow:policy-check`
6. `npm run workflow:inventory-check`
7. `npm run workflow:self-test`

## How To Decide Where A Change Belongs

Use this order:

1. Policy/profile if it is project data, classification, expected file paths, command names, URLs, or gate contract.
2. Knowledge if it is human/agent guidance about project patterns, invariants, or operational practice.
3. Record if it is evidence of something that happened.
4. Template if it changes the shape future records should follow.
5. Script only if deterministic behavior or parsing/enforcement must change.
6. Hook only if a thin lifecycle trigger must call the script.

If two places seem to own the same rule, consolidate toward policy/profile plus one script consumer. The goal is not zero duplication; the goal is one authoritative owner for each rule.

## Loose Document Policy

Do not create one-off planning documents at the repo root or random `.codex/` paths.

- User intent belongs in `records/intents/`.
- Lead implementation scope belongs in `records/work-slices/`.
- Decisions belong in `records/decisions/`.
- Patch, review, verification, audit, routing, guide-browser, and deployment evidence belongs in the matching record directory.
- Durable project guidance belongs in `.codex/knowledge/`.
- Historical research/audit reports belong in `.codex/workflow/research/` and should be referenced from records or current state when still relevant.
- Generated human views belong under `.codex/dashboard/`.
- Runtime logs and cache belong under `.codex/workflow/runtime/` and `.codex/workflow/state/`.

If a note is worth keeping but not worth loading every session, put it in `research/` with a clear title and link it from a record or the relevant knowledge file.

## Migration Minimum

Before claiming the workflow works in another project:

1. Replace profile and policy with target-project facts.
2. Rename the wrapper and package scripts.
3. Replace Nexus knowledge files with target-project knowledge.
4. Start fresh records and current state.
5. Run policy, inventory, trace, self-test, and release gates.
6. Exercise at least one easy task, one hard/escalation task, one review-trigger task, and one failure-path test.
7. Record what failed and whether the fix changed policy, knowledge, script behavior, or only documentation.
