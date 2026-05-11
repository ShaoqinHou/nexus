---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260511T150243Z-deploy-bounded-activity-tracing-workflow-guide"
created: "2026-05-11T15:02:43.460Z"
target: "https://cv.rehou.games/nexus/"
verdict: "pass"
operator: "codex-lead"
workSliceIds: ["WORK-SLICE-20260511T140619Z-work-slice-active-add-policy-owned-activity-trac","WORK-SLICE-20260511T144402Z-work-slice-active-resolve-activity-trace-audit-f","WORK-SLICE-20260511T145314Z-work-slice-active-bound-generated-guide-record-e"]
commandIds: ["deploy-server-sync-activity-tracing-20260511","deploy-public-guide-copy-activity-tracing-20260511","deploy-production-app-check-activity-tracing-20260511","deploy-public-guide-check-activity-tracing-20260511"]
commandEvidence: [{"id":"deploy-server-sync-activity-tracing-20260511","command":["ssh","-i","C:/Users/housh/.ssh/DIOkii","configured SSH endpoint","cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && git rev-parse --short HEAD"],"cwd":".","startedAt":"2026-05-11T15:01:57.349Z","endedAt":"2026-05-11T15:01:59.648Z","durationMs":2298,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"deploy-public-guide-copy-activity-tracing-20260511","command":["scp","-i","C:/Users/housh/.ssh/DIOkii",".codex/dashboard/public.html","configured SSH endpoint:/var/www/cv.rehou.games/nexus/workflow/index.html"],"cwd":".","startedAt":"2026-05-11T15:02:10.177Z","endedAt":"2026-05-11T15:02:11.352Z","durationMs":1174,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"deploy-production-app-check-activity-tracing-20260511","command":["npm","run","workflow:production-app-check"],"cwd":".","startedAt":"2026-05-11T15:02:24.320Z","endedAt":"2026-05-11T15:02:25.004Z","durationMs":684,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"deploy-public-guide-check-activity-tracing-20260511","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-11T15:02:25.428Z","endedAt":"2026-05-11T15:02:27.060Z","durationMs":1632,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false}]
checks: ["Server repo fast-forwarded to 2011abc on codex/native-workflow; public workflow guide copied to /var/www/cv.rehou.games/nexus/workflow/index.html; production app/API and public guide/Zoo image checks passed."]
artifacts: []
artifactEvidence: []
guideArtifactHash: "7d380cb1b07483161718a2f9"
guideArtifacts: {"publicGuideUrl":"https://cv.rehou.games/nexus/workflow/","visualZooGuideUrl":"https://cv.rehou.games/nexus/workflow/zoo/","artifactHash":"7d380cb1b07483161718a2f9","files":[{"file":"public.html","sha256":"df0d80dba728105871aada10b250275f96ace0b1ce84fa782950911c619a483b","bytes":240094,"version":"nexus-public-workflow-guide/v2","sourceHash":"ed0cc8d404e56ec8991da29e","recordFeedHash":"13502a0af9e668511e02072f","contentHash":"b29ce4f3e2678d48e1b8303a"},{"file":"zoo/index.html","sha256":"8ac26e08c3e8c106eaaa310c7c32219cea1357d067302065b1162f2a882a9267","bytes":57360,"version":"nexus-design-zoo-visual-guide/v1","sourceHash":"cb9e34e80374c6f011b61755","recordFeedHash":"","contentHash":"824b803aaf385c33717b98f1"},{"file":"zoo/manifest.json","sha256":"c51dba5063781a61be2127c29a3366ef61128204f4024643abad0273991d581b","bytes":55315,"version":"","sourceHash":"","recordFeedHash":"","contentHash":""}]}
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "bbf1b6bf26692d32"
---

# Deploy bounded activity tracing workflow guide

Target: https://cv.rehou.games/nexus/
Verdict: pass
Operator: codex-lead
Branch evidence hash: bbf1b6bf26692d32
Work slices: WORK-SLICE-20260511T140619Z-work-slice-active-add-policy-owned-activity-trac, WORK-SLICE-20260511T144402Z-work-slice-active-resolve-activity-trace-audit-f, WORK-SLICE-20260511T145314Z-work-slice-active-bound-generated-guide-record-e
Command run ids: deploy-server-sync-activity-tracing-20260511, deploy-public-guide-copy-activity-tracing-20260511, deploy-production-app-check-activity-tracing-20260511, deploy-public-guide-check-activity-tracing-20260511
Checks: Server repo fast-forwarded to 2011abc on codex/native-workflow; public workflow guide copied to /var/www/cv.rehou.games/nexus/workflow/index.html; production app/API and public guide/Zoo image checks passed.
Guide artifact hash: 7d380cb1b07483161718a2f9
Command evidence:
- deploy-server-sync-activity-tracing-20260511: exit 0, timedOut=false, durationMs=2298, command=ssh -i C:/Users/housh/.ssh/DIOkii configured SSH endpoint cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && git rev-parse --short HEAD
- deploy-public-guide-copy-activity-tracing-20260511: exit 0, timedOut=false, durationMs=1174, command=scp -i C:/Users/housh/.ssh/DIOkii .codex/dashboard/public.html configured SSH endpoint:/var/www/cv.rehou.games/nexus/workflow/index.html
- deploy-production-app-check-activity-tracing-20260511: exit 0, timedOut=false, durationMs=684, command=npm run workflow:production-app-check
- deploy-public-guide-check-activity-tracing-20260511: exit 0, timedOut=false, durationMs=1632, command=npm run workflow:public-guide-deployed-check
Notes: This deploy publishes the workflow guide update only; app/API code was validated but not rebuilt because this slice changed workflow guide/system files, not served app runtime code.
