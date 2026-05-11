---
schema: "nexus-test/v1"
id: "TEST-20260511T092132Z-verification-pass-worktree"
created: "2026-05-11T09:21:32.249Z"
scope: "worktree"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "e6f53550cf1a6ed6"
files: [".agents/skills/nexus-workflow/SKILL.md",".codex/README.md",".codex/scripts/nexus-workflow.mjs",".codex/scripts/workflow-engine.mjs",".codex/workflow/capabilities.md",".codex/workflow/policy/adapters.json",".codex/workflow/policy/files.json",".codex/workflow/policy/gates.json",".codex/workflow/policy/guide.json",".codex/workflow/policy/manifest.json",".codex/workflow/policy/portability.json",".codex/workflow/principles.md",".codex/workflow/project/README.md",".codex/workflow/project/adapters/codex/agents/nexus-auditor.toml",".codex/workflow/project/adapters/codex/agents/nexus-design-reviewer.toml",".codex/workflow/project/adapters/codex/agents/nexus-pattern-reviewer.toml",".codex/workflow/project/adapters/codex/agents/nexus-researcher.toml",".codex/workflow/project/adapters/codex/agents/nexus-spark-worker.toml",".codex/workflow/project/adapters/codex/agents/nexus-strong-worker.toml",".codex/workflow/project/adapters/codex/agents/nexus-verifier.toml",".codex/workflow/project/adapters/codex/config.toml",".codex/workflow/project/adapters/codex/hooks.json",".codex/workflow/project/adapters/github/workflows/nexus-workflow-gates.yml",".codex/workflow/project/adapters/repo-skills/skills/nexus-audit/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-audit/agents/openai.yaml",".codex/workflow/project/adapters/repo-skills/skills/nexus-review/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-review/agents/openai.yaml",".codex/workflow/project/adapters/repo-skills/skills/nexus-verify/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-verify/agents/openai.yaml",".codex/workflow/project/adapters/repo-skills/skills/nexus-workflow/SKILL.md",".codex/workflow/project/adapters/repo-skills/skills/nexus-workflow/agents/openai.yaml",".codex/workflow/project/adapters/root/AGENTS.md",".codex/workflow/project/adapters/root/WORKFLOW.md",".codex/workflow/system/README.md",".codex/workflow/templates/project-bootstrap.md","AGENTS.md","WORKFLOW.md","package.json"]
patchId: ""
workSliceIds: ["WORK-SLICE-20260511T080031Z-work-slice-active-implement-behavior-preserving-"]
commandIds: ["adapter-check-final3-20260511t0918","adapter-sync-dry-run-final3-20260511t0918","policy-check-final3-20260511t0918","inventory-check-final3-20260511t0918","routing-check-final3-20260511t0918","self-test-final3-20260511t0918","model-routing-check-final3-20260511t0918","work-intake-check-final3-20260511t0918","guide-check-worktree3-20260511t0922","zoo-visual-guide-check-worktree3-20260511t0922","dependency-audit-check-final2-20260511t0910","design-lint-final2-20260511t0910","theme-settings-preview-check-final2-20260511t0910","unit-tests-final2-20260511t0910","build-final2-20260511t0910","prod-zoo-bundle-check-final2-20260511t0910"]
commandEvidence: [{"id":"adapter-check-final3-20260511t0918","command":["npm","run","workflow:adapter-check"],"cwd":".","startedAt":"2026-05-11T09:16:32.939Z","endedAt":"2026-05-11T09:16:33.448Z","durationMs":509,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"adapter-sync-dry-run-final3-20260511t0918","command":["npm","run","workflow:adapter-sync","--","--dry-run"],"cwd":".","startedAt":"2026-05-11T09:16:49.795Z","endedAt":"2026-05-11T09:16:50.228Z","durationMs":432,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"policy-check-final3-20260511t0918","command":["npm","run","workflow:policy-check"],"cwd":".","startedAt":"2026-05-11T09:17:00.179Z","endedAt":"2026-05-11T09:17:00.739Z","durationMs":560,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"inventory-check-final3-20260511t0918","command":["npm","run","workflow:inventory-check"],"cwd":".","startedAt":"2026-05-11T09:17:10.454Z","endedAt":"2026-05-11T09:17:11.054Z","durationMs":600,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"routing-check-final3-20260511t0918","command":["npm","run","workflow:routing-check"],"cwd":".","startedAt":"2026-05-11T09:17:18.983Z","endedAt":"2026-05-11T09:17:19.965Z","durationMs":982,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"self-test-final3-20260511t0918","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-11T09:17:27.222Z","endedAt":"2026-05-11T09:17:37.923Z","durationMs":10701,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"model-routing-check-final3-20260511t0918","command":["npm","run","workflow:model-routing-check"],"cwd":".","startedAt":"2026-05-11T09:17:46.380Z","endedAt":"2026-05-11T09:17:46.817Z","durationMs":437,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"work-intake-check-final3-20260511t0918","command":["npm","run","workflow:work-intake-check"],"cwd":".","startedAt":"2026-05-11T09:17:55.230Z","endedAt":"2026-05-11T09:17:56.734Z","durationMs":1504,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"guide-check-worktree3-20260511t0922","command":["npm","run","workflow:guide-check"],"cwd":".","startedAt":"2026-05-11T09:21:07.700Z","endedAt":"2026-05-11T09:21:09.382Z","durationMs":1682,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"zoo-visual-guide-check-worktree3-20260511t0922","command":["npm","run","workflow:zoo-visual-guide-check"],"cwd":".","startedAt":"2026-05-11T09:21:16.907Z","endedAt":"2026-05-11T09:21:17.378Z","durationMs":471,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"dependency-audit-check-final2-20260511t0910","command":["npm","run","workflow:dependency-audit-check"],"cwd":".","startedAt":"2026-05-11T09:07:12.958Z","endedAt":"2026-05-11T09:07:14.582Z","durationMs":1624,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"design-lint-final2-20260511t0910","command":["npm","run","lint:design"],"cwd":".","startedAt":"2026-05-11T09:07:23.162Z","endedAt":"2026-05-11T09:07:23.743Z","durationMs":581,"timeoutMs":90000,"exitCode":0,"timedOut":false,"warned":false},{"id":"theme-settings-preview-check-final2-20260511t0910","command":["npm","run","workflow:theme-settings-preview-check"],"cwd":".","startedAt":"2026-05-11T09:07:32.138Z","endedAt":"2026-05-11T09:07:38.286Z","durationMs":6148,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"unit-tests-final2-20260511t0910","command":["npm","test"],"cwd":".","startedAt":"2026-05-11T09:07:47.166Z","endedAt":"2026-05-11T09:08:02.916Z","durationMs":15750,"timeoutMs":360000,"exitCode":0,"timedOut":false,"warned":false},{"id":"build-final2-20260511t0910","command":["npm","run","build"],"cwd":".","startedAt":"2026-05-11T09:08:11.036Z","endedAt":"2026-05-11T09:08:24.449Z","durationMs":13413,"timeoutMs":300000,"exitCode":0,"timedOut":false,"warned":false},{"id":"prod-zoo-bundle-check-final2-20260511t0910","command":["npm","run","workflow:prod-zoo-bundle-check"],"cwd":".","startedAt":"2026-05-11T09:08:36.296Z","endedAt":"2026-05-11T09:08:37.023Z","durationMs":727,"timeoutMs":60000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
artifactEvidence: []
---

# Verification pass worktree

Scope: worktree
Verdict: pass
Verifier: codex-lead
Worktree hash: e6f53550cf1a6ed6

Work slices: WORK-SLICE-20260511T080031Z-work-slice-active-implement-behavior-preserving-

Command run ids: adapter-check-final3-20260511t0918, adapter-sync-dry-run-final3-20260511t0918, policy-check-final3-20260511t0918, inventory-check-final3-20260511t0918, routing-check-final3-20260511t0918, self-test-final3-20260511t0918, model-routing-check-final3-20260511t0918, work-intake-check-final3-20260511t0918, guide-check-worktree3-20260511t0922, zoo-visual-guide-check-worktree3-20260511t0922, dependency-audit-check-final2-20260511t0910, design-lint-final2-20260511t0910, theme-settings-preview-check-final2-20260511t0910, unit-tests-final2-20260511t0910, build-final2-20260511t0910, prod-zoo-bundle-check-final2-20260511t0910

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
Command evidence:
- adapter-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=509, command=npm run workflow:adapter-check
- adapter-sync-dry-run-final3-20260511t0918: exit 0, timedOut=false, durationMs=432, command=npm run workflow:adapter-sync -- --dry-run
- policy-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=560, command=npm run workflow:policy-check
- inventory-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=600, command=npm run workflow:inventory-check
- routing-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=982, command=npm run workflow:routing-check
- self-test-final3-20260511t0918: exit 0, timedOut=false, durationMs=10701, command=npm run workflow:self-test
- model-routing-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=437, command=npm run workflow:model-routing-check
- work-intake-check-final3-20260511t0918: exit 0, timedOut=false, durationMs=1504, command=npm run workflow:work-intake-check
- guide-check-worktree3-20260511t0922: exit 0, timedOut=false, durationMs=1682, command=npm run workflow:guide-check
- zoo-visual-guide-check-worktree3-20260511t0922: exit 0, timedOut=false, durationMs=471, command=npm run workflow:zoo-visual-guide-check
- dependency-audit-check-final2-20260511t0910: exit 0, timedOut=false, durationMs=1624, command=npm run workflow:dependency-audit-check
- design-lint-final2-20260511t0910: exit 0, timedOut=false, durationMs=581, command=npm run lint:design
- theme-settings-preview-check-final2-20260511t0910: exit 0, timedOut=false, durationMs=6148, command=npm run workflow:theme-settings-preview-check
- unit-tests-final2-20260511t0910: exit 0, timedOut=false, durationMs=15750, command=npm test
- build-final2-20260511t0910: exit 0, timedOut=false, durationMs=13413, command=npm run build
- prod-zoo-bundle-check-final2-20260511t0910: exit 0, timedOut=false, durationMs=727, command=npm run workflow:prod-zoo-bundle-check

Notes: Verification passed after adapter refactor and routing-cache fix. Final3 commands cover workflow adapter/policy/inventory/routing/intake/self-test/model routing plus guide/Zoo checks; final2 commands cover unchanged app/design/dependency/build surfaces.
