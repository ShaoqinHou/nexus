# Original User Brief: Codex-Native Workflow Adaptation

Captured: 2026-05-09

This file preserves the user's original long-running request so future Codex sessions can recover the intent after context compaction or long gaps. Treat this as the north star for the workflow migration and continued design-system work.

---

We need to adapt an existing Claude Code workflow/setup into a Codex-native workflow for this project.

Before doing anything else, first answer this question clearly:

Design system directory inside this project: yes / no / unknown.

Include the exact path(s) checked and the evidence for that answer. I do not remember whether the design system directory is actually under this project, so please inspect before assuming.

This is a large autonomous task. I may be away for a long time, possibly days. Please keep working until you are genuinely confident the workflow is fully adapted, tested repeatedly, deployed/validated where relevant, and ready. Do not stop after a superficial conversion.

Very important: preserve this prompt somewhere durable near the beginning of the work, such as a local markdown note inside the project or an equivalent project-local working brief. The reason is that this session may auto-compact, and if this prompt only lives in conversation context, the original intent may drift or disappear. Please come back to that saved brief repeatedly during the work and compare your current direction against it. If you notice drift, correct course.

You can break this into smaller job slices if needed, but keep the full saved brief as the north star. Do not let local subtask progress replace the end-to-end goal.

This is not a 1:1 translation task. The old setup was designed for Claude Code, with Claude-specific assumptions, commands, agents, loading behavior, compaction behavior, path conventions, model choices, and workflow constraints. The goal is not to rename `.claude` to `.codex`, or `CLAUDE.md` to `AGENTS.md`. The goal is to understand what the old workflow was trying to achieve, decide what parts are still valuable, identify what parts were only workarounds for Claude Code, and design a Codex-native workflow that achieves the same or better outcome in this project.

Please treat the old Claude Code setup as historical evidence, not as an authoritative target.

Context:

- Past environment: Claude Code.
  The project may contain Claude-specific instructions, slash commands, subagents, hooks, prompt files, fixed paths, assumptions about context loading, assumptions about compaction, assumptions about model families, and workflows that made sense only under Claude Code.

- Current environment: Codex.
  Codex has different project instruction loading, different agent/subagent behavior, different model choices, different tool/runtime behavior, different skill/plugin mechanics, different shell behavior, and different ways to coordinate long-running work.

- The old workflow appears to focus heavily on "agent team" and "subagent" concepts. Those were Claude Code features, but the idea behind them matters more than the exact implementation:
  - context isolation between agents,
  - specialized agents for different task types,
  - a lead/worker structure,
  - cheaper/faster models doing heavily guided small work,
  - stronger models supervising, planning, reviewing, or taking over when weaker/faster workers fail.

Do not assume that putting agent descriptions in markdown is enough. The important question is whether the workflow actually invokes the right agent at the right time, with the right context, and with a reliable fallback if the agent fails, produces poor output, loops, hangs, or cannot solve the task. The definition of "done" must include evidence that this works in practice, not only that configuration files exist.

Codex behavior research is especially important.

Do not assume Codex works like Claude Code. Please investigate what Codex actually supports in this environment:
- What agent mechanisms are available?
- Are there subagents, agent roles, agent teams, workers, or model-specific workers?
- How are agents invoked?
- Do agents share context, or are their contexts isolated?
- Can agents communicate with each other directly, or only through the lead/session/files?
- How does context compaction affect long-running work?
- What can be configured in project files versus what only exists in the current session?
- What is reliable enough to build workflow around, and what is only a convention/prompting pattern?

Do not blindly trust research results. Some docs, examples, cached assumptions, or remembered behavior may be stale, incomplete, or wrong. Inspect the local project first, inspect the actual Codex environment/tools available in the session, and use official/current sources where needed. Treat research as hypotheses and verify important assumptions empirically inside this project before depending on them.

Model routing is a specific area to investigate.

Pay special attention to whether a very fast model such as Codex Spark can be useful for tightly guided coding slices. The hypothesis is not that Spark should do everything. The hypothesis is that Spark may be good enough, and much faster, for small heavily guided implementation tasks where:
- the lead has already decomposed the work clearly,
- the write scope is narrow,
- the expected behavior is explicit,
- tests or verification are available,
- the task does not require broad architectural judgment.

But this must be proven, not assumed. Investigate what Spark is good at and what it is not good at in this project. Be especially careful with complex architecture, ambiguous debugging, cross-cutting refactors, visual/vision-related validation, design judgment, and tasks where missing context is dangerous. Those should likely remain with stronger models such as GPT-5.5, or fall back to them when Spark fails.

The workflow should be tested for correct model routing:
- For small guided coding tasks, does the lead invoke the fast worker as intended?
- For harder or ambiguous tasks, does the lead choose the stronger model instead of incorrectly using Spark?
- If Spark produces weak output, fails tests, hangs, or cannot reason through the task, does the workflow detect that and fall back to the stronger model?
- Does the retry/fallback path actually work in practice, or only exist as a written instruction?
- Are there clear criteria for when Spark is allowed, when it is not allowed, and when escalation is required?

Please test this with both easy and harder representative tasks. Include tasks where Spark should be suitable, and tasks where it should not be suitable. The goal is to verify that the lead/worker system routes work intelligently rather than always using the same worker or blindly following a markdown label.

Another major purpose of the old workflow was to stop LLMs from mixing incompatible coding patterns into the same codebase.

This matters because LLMs often implement a feature using whatever pattern is locally visible or familiar, even when the project has a preferred architecture. For example, route management might be centralized in one part of the app, distributed in another, and handled with an older deprecated pattern somewhere else. If a coding agent does not understand the intended pattern, it may add another variant, miss required route updates, or make future refactors harder.

This concern is broader than routing. The adapted Codex workflow should help coding agents understand:
- the project's preferred patterns,
- the reason those patterns exist,
- when older patterns are deprecated or only historical,
- where related code usually needs to be updated together,
- what invariants must be preserved,
- what signals suggest an undocumented pattern exists.

The mechanism is an open design decision. It might involve skills, agent definitions, markdown rules, memory-like project notes, review checklists, scripts, generated pattern indexes, or something else. Do not assume one mechanism is enough. Research and test what actually works in Codex.

The pattern guidance system should also be easy to expand. If the agent finds an important project pattern, repeated mistake, undocumented invariant, or recurring review issue, there should be a natural way to add it to the workflow so future coding agents benefit. Ideally, the workflow should support agents updating or proposing updates to this guidance when they discover durable project knowledge, without turning the system into noisy unreviewed notes.

There is a second related requirement: focused review after code changes.

The workflow should include a reliable review process where code changes are checked against the same project patterns and intentions that guide implementation. This might happen after a patch, before a commit, at commit time, or through another mechanism. The exact design is open, but the goal is important: a review agent should be able to focus on whether the change follows project patterns, updates all related places, avoids old/deprecated approaches, and does not introduce another incompatible style.

The current or old workflow may have attempted this but missed triggers too often. Please treat review triggering as a system design problem, not just a written instruction.

Think about bookkeeping and failure modes:
- How does the system know a code patch happened?
- How does the lead know which changes need review?
- Can the lead register or record patches so review is not forgotten?
- Can the workflow remind or require the lead to dispatch review?
- What if the lead forgets to register a change?
- What if a coding agent performs extra changes the lead did not expect?
- What if parallel workers touch different files and only some changes get reviewed?
- What if a review agent has too much context and misses the specific pattern issue?
- What if the review process is too slow and agents start skipping it?

The definition of "done" must include evidence that this review workflow actually works. Test cases should include normal changes, parallel changes, accidental extra changes, and changes that intentionally violate known project patterns to see whether the review system catches them.

There is another important workflow concern: a reusable project workflow, knowledge, and bookkeeping system.

The old workflow was held together mostly by hooks and scattered handover documents. That helped somewhat, but the records were messy, inconsistent, and not reliable enough as a system. I do not want a one-time handover tailored only to this autonomous run. I want the adapted Codex workflow to include a reusable project-level system for recording project state, workflow state, decisions, patches, reviews, risks, tests, deployment history, and future handovers.

This should be treated as durable project infrastructure for future AI and human sessions, not a final report for this one migration.

The system should be mostly self-contained under a clearly named workflow root inside the project root, probably something like `.codex/` if that fits the repo, or another project-appropriate location. It is acceptable if some workflow-related files need to live elsewhere because of tool or repo conventions, but the system should be discoverable, organized, and mostly rooted in one place when practical. If the workflow root is hidden, such as `.codex/`, make sure there is also an obvious project-facing entry point or pointer so humans and future agents can find it.

This should not become another pile of messy notes. Please treat it as a real workflow design problem.

The goal is a reusable record system that can support:
- the lead agent checking what has happened,
- worker/review agents understanding what they need without loading too much context,
- future sessions resuming safely after compaction or long gaps,
- scripts or tools validating whether required records/reviews exist,
- humans understanding project status without reading every raw agent transcript,
- future extension as new workflows, roles, patterns, tests, and project areas are discovered.

The exact mechanism is open. It might involve markdown files, structured JSON/YAML, generated indexes, a lightweight local dashboard, a small web/wiki-style app, scripts, templates, or a combination. Do not assume a heavy system is required, but also do not ignore the need for structure.

Important design intent:

- Handover records should be small enough for AI/LLM context.
- Detailed records should live elsewhere and be referenced from the handover.
- A lead agent should be able to read a compact current-state handover, then jump to detailed records only when needed.
- Records should make it clear what happened, when it happened, why it happened, what files were affected, what tests/reviews ran, what remains risky, and what the next step is.
- The system should support both AI use and human navigation.
- The file structure should be clear enough that a future agent knows where to write, read, summarize, and update records.
- The records should be easy to inspect, diff, review, and possibly validate with scripts.
- The system should avoid unbounded log sprawl and avoid dumping huge transcripts into core handover context.
- The system should reference existing docs, issues, CI history, commits, and logs where appropriate instead of duplicating everything.

Think about different useful views into the project:
- current workflow state,
- design system state,
- code architecture and framework structure,
- known project patterns and invariants,
- active tasks and historical decisions,
- patch/review history,
- test and deployment history,
- server/runtime state,
- unresolved risks,
- onboarding view for a new agent or human.

A small navigable wiki or local project dashboard might be useful, but only if it fits the repo and actually improves understanding. The important thing is not the form; the important thing is that project knowledge becomes organized, resumable, inspectable, and useful.

This record system should connect to the pattern-guidance and focused-review systems. For example:
- when a lead or worker changes code, the relevant patch/review record should be discoverable;
- when a repeated mistake is found, the durable project-pattern guidance should be updated or proposed for update;
- when a review is required, the records should help determine whether it happened;
- when a session resumes, the handover should point to the right detailed records instead of overwhelming context;
- when tests or deployments run, their evidence and result should be recorded in a reusable way;
- when Codex-specific assumptions are discovered, such as available tools, permissions, skills/plugins, workspace paths, model behavior, or differences from Claude Code, they should be captured clearly.

Please research, design, test, and refine this as part of the Codex workflow adaptation. Do not just create a single `HANDOVER.md` and call it done unless you have verified that it is actually enough for long-running AI work, review triggering, future resumption, human understanding, and future extension.

When I return after the autonomous run, I should be able to understand the project state through this system without reading the whole chat transcript.

The final result should leave a clear guide or navigation entry point that answers:
- What did I originally ask for?
- What did the agent understand the goal to be?
- What work was done?
- When was it done?
- What changed in the repo?
- What historical cases were tested?
- What tests passed or failed?
- What was tested locally?
- What was tested on the server?
- What was not tested, and why?
- What problems were encountered?
- How were those problems fixed?
- What decisions were made?
- What old Claude workflow pieces were archived?
- What Codex workflow pieces replaced them?
- What risks remain?
- What should the next agent or human do next?

This should not require loading a giant transcript into context. There should be a compact human/AI-readable entry point that links to more detailed records, logs, test evidence, design notes, deployment notes, and patch/review records as needed.

Please understand the project deeply:
- What the project does.
- What the old Claude workflow was trying to support.
- How the development cycle works.
- What "project lead" and "team/worker" behavior meant in the old setup.
- How partial workflows and full end-to-end workflows are supposed to behave.
- What quality standard the workflow is supposed to enforce.
- What failure modes the old setup was trying to prevent.
- Which parts are project-specific versus Claude-specific.
- Which parts were good ideas but poorly or awkwardly implemented because of old constraints.

Please also research how Codex should support the same goals:
- How Codex project instructions should be structured.
- How Codex agents/subagents should be used, if they are useful here.
- How model choice should work in a lead/worker setup.
- Whether skills, plugins, scripts, AGENTS.md, `.codex` config, local tooling, git worktrees, or other Codex-native mechanisms are the right fit.
- How context should be shared without repeating huge prompts.
- How to prevent shallow or inconsistent worker outputs.
- How to avoid hangs, stale context, missing files, encoding problems, path issues, and hidden assumptions.
- How to safely use parallelism where it is genuinely safe.
- How to avoid unsafe parallel edits, merge conflicts, or worktree confusion.

Use parallelism where it helps, but only when it is safe. Read-only research can often run in parallel. Code edits should be split into isolated write scopes, separate branches/worktrees, or another coordination method that prevents workers from editing the same mutable files blindly. The exact mechanism is up to you after inspecting the repo, but unsafe parallel edits should not be treated as a workflow success.

Be dirty-worktree aware. Do not overwrite user work or unrelated local changes. Keep generated artifacts, scratch work, and test outputs controlled and explain where they live.

This project may be large. Time is not the concern. If it takes many hours to do this properly, that is acceptable. Do not optimize for a quick superficial migration. Optimize for a workflow that is reliable, understandable, testable, and Codex-native.

A major concern: agents often do a shallow adaptation where they change names but ignore behavior. Please explicitly avoid that. Look for:
- Claude-only fields or command formats.
- Hardcoded local paths.
- Old assumptions about shell/platform/runtime.
- Old assumptions about subagent behavior.
- Old assumptions about memory/context loading.
- Old assumptions about compaction.
- Old assumptions about file discovery.
- Old assumptions about model names and model capabilities.
- Old assumptions about hooks, MCP, plugins, or tools.
- Prompts that repeat too much context.
- Prompts that omit shared context workers actually need.
- Workflows that hang or wait forever.
- Workflows that produce good-looking final output but are unreliable internally.
- Tests that only check isolated pieces but not the whole workflow.
- Bad old workflow choices that should be replaced, not preserved.

Do not just adapt the files once and stop. I want an explore -> research -> plan -> adapt -> test -> inspect -> improve cycle until the workflow meets the standard.

Testing is especially important.

This project has git history. After you believe the new Codex workflow is ready, use the git history to test it realistically. Go back to earlier commits or states and issue the same kind of jobs/features that the old workflow was meant to handle. Do this on multiple representative features/jobs, not just one. The goal is to understand whether the new workflow works across real historical cases.

When testing, evaluate both:
- The actual result quality.
- The workflow quality.

Workflow quality matters as much as final output. Look for:
- Did the workflow start cleanly?
- Did Codex load the right context?
- Did workers/agents receive enough shared context without repeated bloated prompts?
- Did the lead/worker split behave as intended?
- Did specialized agents get invoked automatically or predictably when appropriate?
- Did the model routing behave as intended?
- Did fallback behavior work when a worker failed or produced poor output?
- Did the focused review process trigger reliably?
- Did the record system capture the right state without bloating context?
- Did any part hang?
- Did any part silently fail?
- Was speed acceptable?
- Were outputs consistent?
- Were intermediate artifacts in the right place?
- Were errors caught early?
- Were failures recoverable?
- Did end-to-end tests exercise the whole system, not only individual scripts?
- Did the workflow remain understandable enough for future use?

Please test both partial workflows and the whole end-to-end workflow together. It is not enough for individual scripts or pieces to work independently if the overall project workflow is fragile.

Do not test only once. Try multiple historical features/jobs so the result is not a lucky pass. If the workflow fails, hangs, produces shallow work, chooses the wrong agent/model, misses context, misses review triggers, loses bookkeeping, or requires too much manual intervention, improve it and test again.

Server/deployment validation is also required.

Under this project, there should be SSH details for connecting to the server that hosts the project. Find and understand those details before calling the workflow done. If the SSH details are not directly under this project, they are likely under a neighboring project within the same master root / monorepo area. Search carefully within that root rather than assuming local-only development is enough.

Most implementation and iteration can happen locally first, but the final workflow/project changes must also be pushed and tested on the server. The server environment may differ from local development, so local success is not sufficient by itself.

When validating on the server, discover and use the project's real deployment conventions. Check:
- The repository/server copy is actually updated.
- The deployment or runtime path matches the intended project.
- Required setup files, workflow files, scripts, agents, or configs are present.
- The adapted workflow can run or be exercised in the server environment as appropriate.
- Any server-only issues are found and fixed rather than ignored.
- There is some evidence that the hosted project is actually using the updated code/workflow, such as a health check, logs, running process, test command, or project-appropriate verification.

If SSH details are missing or unclear, investigate neighboring projects under the shared master root/monorepo before declaring a blocker. If server access still cannot be established after that, document exactly what was searched, what was missing, and what remains blocked.

After the workflow migration is genuinely done, continue the previous project work that this workflow is supposed to support. The project appears to involve adapting a Claude/Anthropic-style design-system workflow or feature into the project, and that state is not finished. Find the design system, inspect the current implementation, identify the source of truth, run or build appropriate end-to-end checks, identify missing pieces, and improve it using the new workflow.

This continued design-system work should include detailed end-to-end validation, not just isolated unit checks. Where useful, test multi-agent interaction patterns too, including agents acting from different user or project roles, so the collaboration workflow itself is exercised.

If you discover issues during testing, fix the workflow and test again. If the old workflow was weak, improve it. If Codex has a better-native way to do something, use that. If the old setup encoded useful domain judgment, preserve that judgment in the new workflow.

Once the Codex-native workflow is genuinely ready and the continued project work has reached a good stopping point:
- Commit the final changes according to the repo's conventions.
- Move the old Claude Code-related workflow/configuration into a backup/archive location that fits the repo, rather than leaving it active where it can confuse future agents.
- Keep enough old material preserved so we can inspect the migration history later.
- Make clear in the final summary what changed, what was intentionally not preserved, what was improved, what was tested, what failed during testing, how it was fixed, what was deployed or validated on the server, and what risks remain.

Completion evidence should include:
- files changed,
- important decisions made and why,
- commands/tests run,
- historical cases tested,
- model-routing tests and results,
- focused-review trigger tests and results,
- workflow/knowledge/bookkeeping structure and example records,
- evidence that future agents can resume from the compact entry point plus linked detail records,
- deployment/server validation evidence or exact blocker,
- archive location for old Claude workflow,
- commit hash or clear commit status,
- unresolved risks and next steps.

The standard is not "the files were converted."
The standard is "the project now has a Codex-native workflow that has been thought through, tested on realistic historical cases, improved based on those tests, documented in a reusable workflow/knowledge system, deployed/tested on the server where relevant, and is ready to use."
