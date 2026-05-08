# Codex Capability Research

Date: 2026-05-09

Sources:

- https://developers.openai.com/codex/concepts/customization
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/pricing

## Findings

- Codex durable project guidance is `AGENTS.md`, with nested files closer to the working directory taking precedence.
- Project-scoped `.codex/config.toml` is supported, but project `.codex/` config and hooks load only for trusted projects.
- Codex has built-in `default`, `worker`, and `explorer` agents.
- Project-scoped custom agents can live under `.codex/agents/*.toml`.
- Custom agent files require `name`, `description`, and `developer_instructions`; they may set `model`, `model_reasoning_effort`, `sandbox_mode`, MCP servers, and skill config.
- Codex subagents do not auto-spawn from markdown. The lead/session must explicitly spawn them.
- Subagents have isolated context and communicate through the parent session, files, and returned summaries.
- Subagents inherit current sandbox/approval runtime overrides, so agent config is guidance plus defaults rather than an absolute security boundary.
- Repo skills live under `.agents/skills`; skills use progressive disclosure and are a good fit for reusable workflows.
- Hooks can run on `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, and `Stop`.
- Codex hooks are behind `features.codex_hooks = true`.
- Hooks can inject context, warn, deny some tool use, or continue a stopped turn.
- Hook interception is useful but incomplete and should be treated as a guardrail, not the only enforcement boundary.
- `/review` exists in Codex CLI, but project-specific review still needs standards-aware prompts, agents, and record keeping.
- Context compaction is session-level. Durable project records are still necessary for long autonomous work.

## Workflow Implications

- Keep `AGENTS.md` small and route detailed guidance to `.codex/knowledge`.
- Use `.codex/agents` for role/model defaults, but keep the lead responsible for routing and fallback.
- Use `.agents/skills` for reusable task entry points.
- Use deterministic scripts for bookkeeping and validation.
- Use hooks to register patches and block obviously unsafe commits, while still requiring lead discipline and explicit review records.
- Use `.codex/workflow/current-state.md` as the compact resume point.

## Model Routing Policy

- Spark is allowed only for small, narrow, testable implementation slices with explicit file ownership and clear expected behavior.
- Spark is not allowed for broad architecture, ambiguous debugging, design judgment, visual validation, deployment debugging, or cross-cutting refactors.
- A failed Spark slice must escalate to a stronger model. Failure includes test failure, scope creep, weak reasoning, hanging, or edits outside assigned ownership.
- Review and design judgment use stronger models by default.
