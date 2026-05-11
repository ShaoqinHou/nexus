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
   Workflow enforcement routes through the reusable system kernel at `.codex/workflow/system/scripts/workflow-kernel.mjs`, reached by the project wrapper at `.codex/scripts/nexus-workflow.mjs`. Do not create parallel closeout checklists that duplicate gate logic.

3. Project facts live in policy, profile, and knowledge.
   Paths, file classifiers, record schemas, guide contracts, deployment URLs, design-system inputs, hook expectations, adapter targets, adapter source owners, and routing scenarios belong in `.codex/workflow/profile.json` and `.codex/workflow/policy/*.json` first. Project patterns and invariants belong in `.codex/knowledge/`; canonical exact-file adapter sources belong in `.codex/workflow/project/adapters/`.

4. Hooks are thin triggers.
   Hooks can remind, invalidate, or block obvious unsafe actions. They must not contain LLM review logic, project judgment, or long checklists. Judgment belongs in reviews, audits, verification records, skills, and knowledge files.

5. Generated views are delete-safe aids.
   `.codex/dashboard/`, public workflow guides, and Zoo/Gym guide pages help humans inspect the workflow. They are generated views over records, policy, and knowledge. Gates use hashes and browser evidence to prove freshness, but generated HTML is still not canonical memory.

6. State cache is derived and must stay ID-coherent.
   Files under `.codex/workflow/state/` can speed up status checks, but every cached record pointer must match the record id it claims. Closing or repairing older evidence must not overwrite the current cache with mixed metadata from another record; if cache and records disagree, fix the deterministic cache update path and rely on records as truth.

7. Work Intake protects user intent.
   User prompts are captured as compact intent records, then converted into lead-owned work slices. Later bug reports, vague feature ideas, and corrections should update or supersede work slices instead of creating random one-off notes.

8. Review, verify, and audit are automatic workflow obligations.
   They are not only actions taken when the user asks. Substantive changes need focused review records, command or artifact-backed verification records, and audit records when policy requires them.

9. Pattern guidance is evidence-based.
   If an agent finds a repeated mistake, undocumented invariant, deprecated approach, or useful convention, it creates a pattern proposal first. Durable guidance changes only after the source code, tests, history, or reference docs support it.

10. Model routing is explicit.
   Fast workers are allowed only for narrow, heavily guided work with clear scope and tests. Ambiguous debugging, architecture, visual/design judgment, deployment, and cross-cutting changes stay with a strong model or the lead.

11. Portability means copying the system and replacing project data.
   The reusable system layer can be copied. Nexus app paths, design-system details, deployment URLs, tenant rules, package scripts, adapter sources, knowledge, generated guides, and historical records must be rewritten, regenerated, or discarded for the target project. The executable proof is `npm run workflow:portability-check`, which role-plays a fresh empty project with disabled/stubbed optional capabilities.

12. Fixed-path integration is an adapter problem.
   Some tools require files outside the workflow root, such as `AGENTS.md`, `.codex/config.toml`, repo skills, CI workflow files, and package scripts. `.codex/workflow/policy/adapters.json` declares every target and its source owner. Exact-file outputs are sourced from `.codex/workflow/project/adapters/`; package workflow scripts are sourced from `.codex/workflow/policy/gates.json` `gates.packageScripts`.
   Exact-file script adapter sources are target-path payloads, not standalone runnable scripts from the adapter directory. Install or check them through the adapter commands.

## Responsibility Map

| Area | Role | Porting rule |
| --- | --- | --- |
| `AGENTS.md` | Codex session instructions and project hard rules | Copy shape, rewrite project identity, stack, hard rules, command names, and agent names. |
| `WORKFLOW.md` | Human-facing root pointer | Copy shape, rewrite as the shortest "start here" for the target project. |
| `.codex/README.md` | Detailed workflow entry point | Copy shape, rewrite project-specific sections and links. |
| `.codex/workflow/principles.md` | Base design and portability map | Copy, then adjust only if the target workflow intentionally changes principles. |
| `.codex/workflow/system/scripts/workflow-engine.mjs` | Reusable loader, path policy, sanitizer, and matching helpers | Copy as reusable system code. Installed `.codex/scripts/workflow-engine.mjs` is only a compatibility shim. |
| `.codex/workflow/system/scripts/workflow-kernel.mjs` | Reusable deterministic workflow kernel | Copy as system code. Project facts must arrive through profile, policy, knowledge, records, adapter sources, and capability inputs. |
| `.codex/workflow/system/scripts/run-hook.mjs` | Reusable thin hook dispatcher | Copy as system code; it reads the target wrapper from profile data. |
| `.codex/workflow/system/fixtures/portable-empty/` | Inspectable empty-project fixture for portability role-play | Copy as system reference. It is not target live state; target projects rewrite profile, policy, adapter sources, and records. |
| `.codex/scripts/nexus-workflow.mjs` | Nexus wrapper shim into the system kernel | Rewrite/rename through `.codex/workflow/project/adapters/scripts/` and `profile.paths.workflowWrapper`. |
| `.codex/scripts/run-hook.mjs` | Fixed hook-dispatcher shim | Install from adapter source so Codex hooks have a stable command path. |
| `.codex/workflow/profile.json` | Project identity, root paths, env names, generated surface paths | Rewrite for the target project. |
| `.codex/workflow/policy/*.json` | Project-specific rules consumed by gates | Rewrite first. Do not hardcode target-project facts in scripts until policy cannot express them. |
| `.codex/workflow/system/*` | Reusable workflow-system code, contracts, and adapter design | Copy the system layer first, then verify behavior in the target project. |
| `.codex/workflow/project/*` | Project-specific workflow overlays and canonical exact-file adapter sources | Rewrite before installing fixed-path files. Do not copy Nexus adapter sources as target truth. |
| `.codex/knowledge/*.md` | Durable project patterns and operational knowledge | Rewrite. Do not carry Nexus design/deployment facts as live truth. |
| `.codex/workflow/templates/*.md` | Record shapes and bootstrap guidance | Copy, then rename command examples and project-specific names. |
| `.codex/workflow/scenarios/*.json` | Routing and failure scenarios | Replace with target-project examples. |
| `.codex/agents/*.toml` and `.agents/skills/*` | Project-scoped agent and skill guidance installed from adapter sources | Copy shape, rename roles, rewrite project facts and command names in `.codex/workflow/project/adapters/`, then sync. |
| `.codex/hooks.json` and `.codex/config.toml` | Trusted Codex session integration installed from adapter sources | Copy only after deciding target project permissions and hook needs, then check with adapter/config gates. |
| `.github/workflows/*` | Optional CI gate enforcement installed from adapter sources | Copy only if the target project uses GitHub CI, then rewrite package scripts and branch assumptions. |
| `.codex/workflow/records/*` | Append-only Nexus evidence | Do not copy as live records. Start fresh in the target project. |
| `.codex/workflow/current-state.md` | Compact Nexus handover | Do not copy as live state. Create a new current-state from the target project. |
| `.codex/workflow/research/*` | Historical Nexus audits and decisions | Keep in Nexus. For another project, copy only selected files into an archive/reference folder if they help explain the migration. |
| `.codex/dashboard/*` | Generated Nexus views and visual artifacts | Do not copy as truth. Regenerate in the target project after policy/profile are adapted. |
| `.codex/workflow/artifacts/*` | Bounded screenshots and summaries referenced by records or generated visual guides | Do not copy as truth. Keep only policy-approved, record-linked evidence or regenerated artifacts. |
| `.codex/workflow/state/*` and `.codex/workflow/runtime/*` | Mutable local cache and telemetry | Do not copy except `.gitignore` placeholders. |

## Workflow File Roles

The machine-owned role taxonomy lives in `.codex/workflow/policy/files.json` under `inventory.roleTaxonomy`. It is the source of truth for whether a workflow path is system code, project adapter source, project policy/profile data, append-only evidence, generated artifact, mutable cache, or workflow documentation.

Use these groups when deciding what to open, edit, copy, or discard:

| Group | Examples | Read/Edit Rule |
| --- | --- | --- |
| System code | `.codex/workflow/system/scripts/*`, `.codex/scripts/*` shims, hook dispatcher | Edit only for deterministic behavior. Project-specific facts should move to profile/policy first. |
| Project adapter sources | `.codex/workflow/project/adapters/*`, `.codex/workflow/project/README.md` | Canonical sources for exact-file adapter outputs. Package workflow scripts are owned by `gates.packageScripts` instead. |
| Project policy/profile data | `.codex/workflow/profile.json`, `.codex/workflow/policy/*.json`, dependency audit baseline | Machine-consumed. Prefer compact JSON facts, enums, path lists, and gate contracts over prose duplication. |
| Workflow design/reference docs | `principles.md`, `capabilities.md`, `templates/*` | Explain intent and usage. These are useful but stale-prone, so they should point at policy owners instead of repeating enums or path lists. |
| Managed handover | `current-state.md` | Compact resume state only. It must not become a changelog or transcript. |
| Append-only evidence | `records/*` | One event per file. Preserve frontmatter for gates; keep the body concise and link to artifacts or command ids for detail. |
| Historical analysis | `research/*`, `briefs/*` | Open by title when needed. Do not bulk-load as current truth. |
| Generated views/artifacts | `.codex/dashboard/*`, `workflow/artifacts/*` | Human inspection aids and evidence attachments. Regenerate or validate; do not edit as canonical memory. |
| Mutable telemetry/cache | `state/*`, `runtime/*` | Delete-safe diagnostics only. Passing records can embed compact summaries from telemetry, but telemetry itself is not durable proof. |

When a new directory or root workflow file is added, update `inventory.roleTaxonomy` and run `npm run workflow:policy-check` plus `npm run workflow:inventory-check`. When a new fixed-path output is added, add it to `.codex/workflow/policy/adapters.json`, declare its source owner, place exact-file sources under `.codex/workflow/project/adapters/` or policy-map sources such as `gates.packageScripts` in their policy owner, and run `npm run workflow:adapter-check`.

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
3. `.codex/workflow/system/README.md`
4. `.codex/workflow/project/README.md`
5. `.codex/workflow/templates/project-bootstrap.md`
6. `.codex/workflow/research/workflow-engine-profile-extraction-2026-05-10.md`
7. `npm run workflow:policy-check`
8. `npm run workflow:inventory-check`
9. `npm run workflow:adapter-check`
10. `npm run workflow:self-test`

## How To Decide Where A Change Belongs

Use this order:

1. Policy/profile if it is project data, classification, expected file paths, command names, URLs, or gate contract.
2. Adapter source owner if it must appear at a fixed tool path. Use `.codex/workflow/policy/adapters.json`: exact-file outputs go under `.codex/workflow/project/adapters/`; package workflow scripts go under `.codex/workflow/policy/gates.json` `gates.packageScripts`.
3. Knowledge if it is human/agent guidance about project patterns, invariants, or operational practice.
4. Record if it is evidence of something that happened.
5. Template if it changes the shape future records should follow.
6. Script only if deterministic behavior or parsing/enforcement must change.
7. Hook only if a thin lifecycle trigger must call the script.

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

1. Copy `.codex/workflow/system/` and the fixed-path shims it requires.
2. Create target profile, policy, knowledge, adapter sources, records root, and current-state from templates.
3. Rename the project wrapper and package scripts through adapter sources and gates policy.
4. Decide capability states in portability policy before adding design/deployment/Zoo/project-specific scripts.
5. Start fresh records and current state.
6. Sync fixed-path outputs and run adapter, capability, policy, inventory, trace, self-test, and release gates.
7. Run `npm run workflow:portability-check` to prove the reusable system can install into an empty project from the inspectable portable fixture plus current system scripts.
8. Exercise at least one easy task, one hard/escalation task, one review-trigger task, and one failure-path test.
9. Record what failed and whether the fix changed policy, knowledge, system code, project adapter sources, or only documentation.
