---
schema: "nexus-test/v1"
id: "TEST-20260508T174136Z-pretooluse-commit-hook-windows-command-matrix"
created: "2026-05-08T17:41:36.054Z"
author: "codex-lead"
---

# PreToolUse commit hook Windows command matrix

Passed tokenizer matrix: DENY git commit, git.exe commit, quoted git commit, PowerShell call operator, git -C commit, git --git-dir/--work-tree commit, chained Write-Host ok; git commit, cmd /c quoted git commit. ALLOW echo git commit, Write-Host git commit, git status commit, Write-Host nope. Focused reviewer rechecked and returned no findings.
