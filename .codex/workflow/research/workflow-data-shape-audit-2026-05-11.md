# Workflow Data Shape Audit

Date: 2026-05-11

## User Concern

The workflow root contains several kinds of files:

- files that directly make the system work,
- project-dependent policy/profile data,
- records and artifacts produced by the system,
- documents about the workflow itself.

The risk is that stale docs or overlarge aggregate files become the thing future LLMs read, while the real system truth lives elsewhere.

## Reference Patterns Checked

- Diataxis separates documentation by purpose: tutorials, how-to guides, reference, and explanation. The relevant lesson for this workflow is to avoid making one document serve all roles. Source: https://diataxis.fr/
- MADR/ADR practice keeps one decision per record with metadata, status, context, and consequences. The relevant lesson is small append-only decision records, not a giant living decision document. Source: https://adr.github.io/madr/
- W3C PROV models provenance as entities, activities, agents, and relationships used to assess quality and trust. The relevant lesson is explicit links from work slices to activities and evidence. Source: https://www.w3.org/TR/prov-overview/
- OpenTelemetry log data separates event body from attributes. The relevant lesson is compact structured attributes for filtering, with detail in body or referenced artifacts only when needed. Source: https://opentelemetry.io/docs/specs/otel/logs/data-model/

## Findings

1. The existing append-only record model is the right base. It is closer to provenance/event records than to a monolithic project document.
2. `current-state.md` had drifted toward a chronological ledger. That makes every future session load stale narrative. It should stay a compact handover.
3. The workflow had a conceptual role map in prose, but the exact file/directory role taxonomy was not machine-owned. That made future porting and audits depend on interpretation.
4. Branch closeout records duplicated the complete branch file set across patch, review, verification, audit, and deployment records. That preserved detail but made LLM reading heavier than needed.
5. Historical compatibility exceptions were stored in the live records policy. They are real project history, but not part of the reusable records contract.
6. Templates duplicated Work Intake enum values that are already owned by `policy/intake.json`.
7. Generated guides swept `workflow/research/` by directory, which makes one-off notes guide inputs by default. That is convenient but stale-prone.

## Decisions Implemented

- `.codex/workflow/policy/files.json` now owns `inventory.roleTaxonomy`.
- `.codex/workflow/principles.md`, `.codex/README.md`, `WORKFLOW.md`, and `AGENTS.md` point humans and agents to that taxonomy.
- `current-state.md` was compacted to active work, durable links, risks, and resume steps.
- Record bodies now limit long file lists and point to structured frontmatter or linked branch patch evidence.
- Future branch review, verification, audit, and deployment records keep branch hash proof without owning the full file list; branch patch records remain the file-list owner.
- Historical legacy schema exceptions moved to `.codex/workflow/policy/compatibility.json`.
- Intent and work-slice templates now point to `policy/intake.json` instead of duplicating enums.
- Guide document inputs now use curated research links instead of directory sweeping.

## Remaining Tradeoff

Existing historical records still contain large frontmatter and body lists. They are committed evidence and should not be rewritten. The fix applies to new records and to the guide/handover path future LLMs read first.

If a second project proves the same branch-evidence pattern works, the next extraction candidate is a generic evidence-bundle abstraction in `workflow-engine.mjs`.
