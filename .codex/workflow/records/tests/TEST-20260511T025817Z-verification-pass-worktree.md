---
schema: "nexus-test/v1"
id: "TEST-20260511T025817Z-verification-pass-worktree"
created: "2026-05-11T02:58:17.507Z"
scope: "worktree"
verdict: "pass"
verifier: "codex-lead"
worktreeHash: "436ce02b9349867a"
files: [".codex/README.md",".codex/scripts/nexus-workflow.mjs",".codex/workflow/current-state.md"]
workSliceIds: ["WORK-SLICE-20260510T230853Z-work-slice-active-finish-nexus-design-system-par"]
commandIds: ["final-guide-determinism-self-test-20260511c","final-guide-determinism-idempotence-20260511c","final-guide-determinism-guide-check-20260511c","final-guide-determinism-zoo-guide-check-20260511c","final-guide-determinism-policy-check-20260511c","final-guide-determinism-inventory-check-20260511c"]
commandEvidence: [{"id":"final-guide-determinism-self-test-20260511c","command":["npm","run","workflow:self-test"],"cwd":".","startedAt":"2026-05-11T02:56:23.136Z","endedAt":"2026-05-11T02:56:29.905Z","durationMs":6769,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-guide-determinism-idempotence-20260511c","command":["node","-e","const {execFileSync}=require('child_process');const {createHash}=require('crypto');const {readFileSync}=require('fs');const shell=process.env.ComSpec||'cmd.exe';const files=['.codex/dashboard/index.html','.codex/dashboard/public.html','.codex/dashboard/zoo/index.html'];const run=(script)=>execFileSync(shell,['/d','/s','/c','npm run '+script],{stdio:'inherit'});const hash=()=>files.map((file)=>createHash('sha256').update(readFileSync(file)).digest('hex')).join(',');['workflow:dashboard','workflow:public-guide','workflow:zoo-visual-guide'].forEach(run);const first=hash();['workflow:dashboard','workflow:public-guide','workflow:zoo-visual-guide'].forEach(run);const second=hash();if(first!==second){throw new Error('generated guide artifacts are not idempotent');}console.log('idempotent guide hashes '+first);"],"cwd":".","startedAt":"2026-05-11T02:56:40.607Z","endedAt":"2026-05-11T02:56:47.654Z","durationMs":7046,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-guide-determinism-guide-check-20260511c","command":["npm","run","workflow:guide-check"],"cwd":".","startedAt":"2026-05-11T02:56:54.034Z","endedAt":"2026-05-11T02:56:55.572Z","durationMs":1538,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-guide-determinism-zoo-guide-check-20260511c","command":["npm","run","workflow:zoo-visual-guide-check"],"cwd":".","startedAt":"2026-05-11T02:57:02.217Z","endedAt":"2026-05-11T02:57:02.637Z","durationMs":420,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-guide-determinism-policy-check-20260511c","command":["npm","run","workflow:policy-check"],"cwd":".","startedAt":"2026-05-11T02:57:09.270Z","endedAt":"2026-05-11T02:57:09.770Z","durationMs":499,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"final-guide-determinism-inventory-check-20260511c","command":["npm","run","workflow:inventory-check"],"cwd":".","startedAt":"2026-05-11T02:57:16.257Z","endedAt":"2026-05-11T02:57:17.041Z","durationMs":784,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false}]
artifacts: []
artifactEvidence: []
---

# Verification pass worktree

Scope: worktree
Verdict: pass
Verifier: codex-lead
Worktree hash: 436ce02b9349867a

Work slices: WORK-SLICE-20260510T230853Z-work-slice-active-finish-nexus-design-system-par
Command run ids: final-guide-determinism-self-test-20260511c, final-guide-determinism-idempotence-20260511c, final-guide-determinism-guide-check-20260511c, final-guide-determinism-zoo-guide-check-20260511c, final-guide-determinism-policy-check-20260511c, final-guide-determinism-inventory-check-20260511c

Files: .codex/README.md, .codex/scripts/nexus-workflow.mjs, .codex/workflow/current-state.md
Command evidence:
- final-guide-determinism-self-test-20260511c: exit 0, timedOut=false, durationMs=6769, command=npm run workflow:self-test
- final-guide-determinism-idempotence-20260511c: exit 0, timedOut=false, durationMs=7046, command=node -e const {execFileSync}=require('child_process');const {createHash}=require('crypto');const {readFileSync}=require('fs');const shell=process.env.ComSpec||'cmd.exe';const files=['.codex/dashboard/index.html','.codex/dashboard/public.html','.codex/dashboard/zoo/index.html'];const run=(script)=>execFileSync(shell,['/d','/s','/c','npm run '+script],{stdio:'inherit'});const hash=()=>files.map((file)=>createHash('sha256').update(readFileSync(file)).digest('hex')).join(',');['workflow:dashboard','workflow:public-guide','workflow:zoo-visual-guide'].forEach(run);const first=hash();['workflow:dashboard','workflow:public-guide','workflow:zoo-visual-guide'].forEach(run);const second=hash();if(first!==second){throw new Error('generated guide artifacts are not idempotent');}console.log('idempotent guide hashes '+first);
- final-guide-determinism-guide-check-20260511c: exit 0, timedOut=false, durationMs=1538, command=npm run workflow:guide-check
- final-guide-determinism-zoo-guide-check-20260511c: exit 0, timedOut=false, durationMs=420, command=npm run workflow:zoo-visual-guide-check
- final-guide-determinism-policy-check-20260511c: exit 0, timedOut=false, durationMs=499, command=npm run workflow:policy-check
- final-guide-determinism-inventory-check-20260511c: exit 0, timedOut=false, durationMs=784, command=npm run workflow:inventory-check

Notes: Verified deterministic guide fix with 254 workflow self-tests, double-regeneration hash idempotence for dashboard/public/Zoo guide artifacts, guide-check, Zoo guide-check, policy-check, and inventory-check.
