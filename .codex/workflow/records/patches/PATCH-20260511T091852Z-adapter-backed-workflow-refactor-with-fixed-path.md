---
schema: "nexus-patch/v1"
id: "PATCH-20260511T091852Z-adapter-backed-workflow-refactor-with-fixed-path"
created: "2026-05-11T09:18:52.787Z"
scope: "worktree"
files: [".agents/skills/nexus-workflow/SKILL.md",".codex/README.md",".codex/scripts/nexus-workflow.mjs",".codex/scripts/workflow-engine.mjs",".codex/workflow/capabilities.md",".codex/workflow/policy/adapters.json",".codex/workflow/policy/files.json",".codex/workflow/policy/gates.json",".codex/workflow/policy/guide.json",".codex/workflow/policy/manifest.json",".codex/workflow/policy/portability.json",".codex/workflow/principles.md",".codex/workflow/project/README.md",".codex/workflow/project/adapters/codex/agents/nexus-auditor.toml",".codex/workflow/project/adapters/codex/agents/nexus-design-reviewer.toml",".codex/workflow/project/adapters/codex/agents/nexus-pattern-reviewer.toml",".codex/workflow/project/adapters/codex/agents/nexus-researcher.toml",".codex/workflow/project/adapters/codex/agents/nexus-spark-worker.toml",".codex/workflow/project/adapters/codex/agents/nexus-strong-worker.toml",".codex/workflow/project/adapters/codex/agents/nexus-verifier.toml",".codex/workflow/project/adapters/codex/config.toml",".codex/workflow/project/adapters/codex/hooks.json",".codex/workflow/project/adapters/github/workflows/nexus-workflow-gates.yml",".codex/workflow/project/adapters/repo-skills/skills/nexus-audit/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-audit/agents/openai.yaml",".codex/workflow/project/adapters/repo-skills/skills/nexus-review/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-review/agents/openai.yaml",".codex/workflow/project/adapters/repo-skills/skills/nexus-verify/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-verify/agents/openai.yaml",".codex/workflow/project/adapters/repo-skills/skills/nexus-workflow/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-workflow/agents/openai.yaml",".codex/workflow/project/adapters/root/AGENTS.md",".codex/workflow/project/adapters/root/WORKFLOW.md",".codex/workflow/system/README.md",".codex/workflow/templates/project-bootstrap.md","AGENTS.md","WORKFLOW.md","package.json"]
agent: "codex-lead"
worktreeHash: "e6f53550cf1a6ed6"
routingId: ""
workSliceIds: ["WORK-SLICE-20260511T080031Z-work-slice-active-implement-behavior-preserving-"]
routingRequired: false
---

# Adapter-backed workflow refactor with fixed-path source owners and routing-cache regression fix

Summary: Adapter-backed workflow refactor with fixed-path source owners and routing-cache regression fix
Scope: worktree
Agent: codex-lead
Routing: n/a
Work slices: WORK-SLICE-20260511T080031Z-work-slice-active-implement-behavior-preserving-


Files: 38 files. Complete file list is preserved in record frontmatter for deterministic gates.
First 24:
- .agents/skills/nexus-workflow/SKILL.md
- .codex/README.md
- .codex/scripts/nexus-workflow.mjs
- .codex/scripts/workflow-engine.mjs
- .codex/workflow/capabilities.md
- .codex/workflow/policy/adapters.json
- .codex/workflow/policy/files.json
- .codex/workflow/policy/gates.json
- .codex/workflow/policy/guide.json
- .codex/workflow/policy/manifest.json
- .codex/workflow/policy/portability.json
- .codex/workflow/principles.md
- .codex/workflow/project/README.md
- .codex/workflow/project/adapters/codex/agents/nexus-auditor.toml
- .codex/workflow/project/adapters/codex/agents/nexus-design-reviewer.toml
- .codex/workflow/project/adapters/codex/agents/nexus-pattern-reviewer.toml
- .codex/workflow/project/adapters/codex/agents/nexus-researcher.toml
- .codex/workflow/project/adapters/codex/agents/nexus-spark-worker.toml
- .codex/workflow/project/adapters/codex/agents/nexus-strong-worker.toml
- .codex/workflow/project/adapters/codex/agents/nexus-verifier.toml
- .codex/workflow/project/adapters/codex/config.toml
- .codex/workflow/project/adapters/codex/hooks.json
- .codex/workflow/project/adapters/github/workflows/nexus-workflow-gates.yml
- .codex/workflow/project/adapters/repo-skills/skills/nexus-audit/SKILL.md
- ... 14 more file(s)

Worktree hash after patch: e6f53550cf1a6ed6
