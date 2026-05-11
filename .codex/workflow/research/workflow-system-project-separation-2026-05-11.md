# Workflow System/Project Separation Research

Date: 2026-05-11

## Question

How should this workflow be structured so another project can point an LLM at the workflow path and have it understand what is reusable system code, what is project data, and what can wait in an empty project?

## External Research Signals

- OpenAI Codex config docs, rechecked through the OpenAI developer-docs MCP on 2026-05-11, say untrusted projects skip project-scoped `.codex/` layers, including local config, hooks, and rules. This supports keeping explicit script gates as enforcement and treating hooks/config as an optional trusted-session layer. Source: https://developers.openai.com/codex/config-reference
- OpenAI Codex hooks/config docs, rechecked through the OpenAI developer-docs MCP on 2026-05-11, say hooks are loaded from `hooks.json` or inline config next to active config layers, and project-local hooks load only when the project `.codex/` layer is trusted. This supports thin hooks plus deterministic gates instead of hook-heavy workflow logic. Source: https://developers.openai.com/codex/config-advanced#hooks-experimental
- Local Codex app warnings in this environment identify `features.codex_hooks` and `features.enable_experimental_windows_sandbox` as deprecated and prefer `features.hooks` and `features.experimental_windows_sandbox`. Nexus policy enforces the locally accepted keys while keeping hook runtime non-authoritative because project trust still controls loading.
- OpenAI Codex plugin docs describe reusable bundles with skills, apps, and MCP servers. This supports a bundle-like separation, but the current project still needs project-local profile/policy/adapters because repo facts and evidence are not generic plugin content. Source: https://developers.openai.com/codex/plugins
- Open Policy Agent separates policy decision-making from enforcement and evaluates structured input against policy/data. This supports keeping workflow rules in JSON policy plus a deterministic kernel rather than scattering prose rules across docs. Source: https://www.openpolicyagent.org/docs
- Backstage models software with components, resources, systems, and domains, and its catalog view is backed by entity metadata. This supports the generated guide/dashboard as a view over structured workflow facts, not as canonical memory. Source: https://backstage.io/docs/getting-started/viewing-catalog/

## Local Findings

- Before this refactor, the extracted system kernel still contained Nexus literals, package paths, CI filenames, and worker names in tests and messages. That made the "system" layer reusable only by convention.
- The better architecture is:
  - system code: `.codex/workflow/system/scripts/workflow-engine.mjs` and `.codex/workflow/system/scripts/workflow-kernel.mjs`;
  - reusable hook dispatch: `.codex/workflow/system/scripts/run-hook.mjs`, installed through a fixed-path shim at `.codex/scripts/run-hook.mjs`;
  - project wrapper shims: `.codex/scripts/<project>-workflow.mjs`, sourced from `.codex/workflow/project/adapters/scripts/`;
  - project data: `.codex/workflow/profile.json`, `.codex/workflow/policy/*.json`, `.codex/knowledge/`, records, generated views, and adapter sources.
- Optional capabilities need executable state, not prose state. `design-system-zoo-gym`, `deployment-validation`, dependency audit, hooks, CI, and generated guide behavior are now mediated by capability state and policy checks.
- Empty-project support should not mean copying Nexus placeholders. The system now has `workflow:portability-check`, which creates a temporary empty project with fresh policy/profile/knowledge stubs and verifies `status`, `capability-check`, `policy-check`, `inventory-check`, and `adapter-check`.

## Decision

Keep one reusable kernel and one reusable loader. Keep all project-specific facts in project data and adapter sources. Preserve fixed-path files through adapter ownership rather than moving every file into the system layer. Use `workflow:portability-check` as the regression test that prevents source-project facts from leaking back into reusable system code.

## Evidence

- `npm run workflow:portability-check` passed after the refactor and verified a temporary empty project.
- The portability check now performs its source-project literal scan inside the Node kernel so the reusable proof does not depend on `rg` being installed in the target environment.
- `npm run workflow:self-test` passed after making self-tests policy-driven instead of Nexus-path-driven.
- `rg -n "Nexus|nexus|packages/|tenant|restaurant|cv\\.rehou|134\\.199" .codex/workflow/system .codex/scripts/nexus-workflow.mjs .codex/scripts/workflow-engine.mjs .codex/workflow/project/adapters/scripts` returned no matches in reusable execution surfaces.
