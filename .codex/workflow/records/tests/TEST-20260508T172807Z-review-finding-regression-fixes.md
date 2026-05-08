---
schema: "nexus-test/v1"
id: "TEST-20260508T172807Z-review-finding-regression-fixes"
created: "2026-05-08T17:28:07.098Z"
author: "codex"
---

# Review finding regression fixes

Fixed focused-review findings: PostToolUse now ignores Bash events without parsed patch files; commit hook detects git commit with options such as --git-dir/--work-tree; workflow files including AGENTS.md, WORKFLOW.md, .codex/README.md, .codex/config.toml, hooks, scripts, agents, skills, knowledge, templates, and research now require verification; verify/audit skills now mention record-verify/record-audit. Regression checks: node --check nexus-workflow ok; validate ok; verify-check now reports 51 verification-relevant files and fails until evidence; pre-tool-use deny works for git --git-dir ... --work-tree ... commit; post-tool-use read-only Bash leaves review-state unchanged.
