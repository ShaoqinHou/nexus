---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260511T062157Z-deploy-workflow-performance-guide-update"
created: "2026-05-11T06:21:57.035Z"
target: "https://cv.rehou.games/nexus/"
verdict: "pass"
operator: "codex-lead"
workSliceIds: ["WORK-SLICE-20260511T012455Z-work-slice-done-finish-nexus-design-system-parit","WORK-SLICE-20260511T040309Z-work-slice-done-audit-and-improve-workflow-porta","WORK-SLICE-20260511T054117Z-work-slice-done-audit-codex-workflow-role-bounda","WORK-SLICE-20260511T061540Z-work-slice-done-audit-workflow-command-telemetry"]
commandIds: ["performance-server-guide-sync-20260511","performance-production-app-check-20260511","performance-public-guide-deployed-check-20260511"]
commandEvidence: [{"id":"performance-server-guide-sync-20260511","command":["ssh","-i","C:/Users/housh/.ssh/DIOkii","configured SSH endpoint","bash -lc 'set -e; cd server repo; git pull --ff-only origin codex/native-workflow; git rev-parse --short HEAD; mkdir -p /var/www/cv.rehou.games/nexus/workflow; cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html; rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo; mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo; cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/; systemctl is-active nexus-api; git rev-parse --short HEAD'"],"cwd":".","startedAt":"2026-05-11T06:21:27.748Z","endedAt":"2026-05-11T06:21:29.532Z","durationMs":1783,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-production-app-check-20260511","command":["npm","run","workflow:production-app-check"],"cwd":".","startedAt":"2026-05-11T06:21:39.317Z","endedAt":"2026-05-11T06:21:39.996Z","durationMs":678,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"performance-public-guide-deployed-check-20260511","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-11T06:21:39.349Z","endedAt":"2026-05-11T06:21:40.963Z","durationMs":1614,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false}]
checks: ["Server repo fast-forwarded to a879419","public workflow guide copied","nexus-api active","production app/API ok","public workflow guide and 58 Zoo/Gym images loaded"]
artifacts: []
artifactEvidence: []
guideArtifactHash: "0d67574bf7f88482e230e442"
guideArtifacts: {"publicGuideUrl":"https://cv.rehou.games/nexus/workflow/","visualZooGuideUrl":"https://cv.rehou.games/nexus/workflow/zoo/","artifactHash":"0d67574bf7f88482e230e442","files":[{"file":"public.html","sha256":"b2ce9eb2e75ae9921923f81078dd322f73d62f8b7ab9754d594307aa6f3905c0","bytes":192140,"version":"nexus-public-workflow-guide/v2","sourceHash":"182a82da653afc6338a6e6de","recordFeedHash":"d048d07901bc928bc43f5feb","contentHash":"5b1556d2042f101698897a1c"},{"file":"zoo/index.html","sha256":"1212955674164ae0649f4ba7b22476c3f1b04b152c9ef597af135f8a61a27826","bytes":57373,"version":"nexus-design-zoo-visual-guide/v1","sourceHash":"00a4119fb4c1027b6f4efa41","recordFeedHash":"","contentHash":"4e367100dcc08042bff3efab"},{"file":"zoo/manifest.json","sha256":"c51dba5063781a61be2127c29a3366ef61128204f4024643abad0273991d581b","bytes":55315,"version":"","sourceHash":"","recordFeedHash":"","contentHash":""}]}
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "14c101a045aebe1a"
---

# Deploy workflow performance guide update

Target: https://cv.rehou.games/nexus/
Verdict: pass
Operator: codex-lead
Branch evidence hash: 14c101a045aebe1a
Work slices: WORK-SLICE-20260511T012455Z-work-slice-done-finish-nexus-design-system-parit, WORK-SLICE-20260511T040309Z-work-slice-done-audit-and-improve-workflow-porta, WORK-SLICE-20260511T054117Z-work-slice-done-audit-codex-workflow-role-bounda, WORK-SLICE-20260511T061540Z-work-slice-done-audit-workflow-command-telemetry
Command run ids: performance-server-guide-sync-20260511, performance-production-app-check-20260511, performance-public-guide-deployed-check-20260511
Checks: Server repo fast-forwarded to a879419, public workflow guide copied, nexus-api active, production app/API ok, public workflow guide and 58 Zoo/Gym images loaded
Guide artifact hash: 0d67574bf7f88482e230e442
Command evidence:
- performance-server-guide-sync-20260511: exit 0, timedOut=false, durationMs=1783, command=ssh -i C:/Users/housh/.ssh/DIOkii configured SSH endpoint bash -lc 'set -e; cd server repo; git pull --ff-only origin codex/native-workflow; git rev-parse --short HEAD; mkdir -p /var/www/cv.rehou.games/nexus/workflow; cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html; rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo; mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo; cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/; systemctl is-active nexus-api; git rev-parse --short HEAD'
- performance-production-app-check-20260511: exit 0, timedOut=false, durationMs=678, command=npm run workflow:production-app-check
- performance-public-guide-deployed-check-20260511: exit 0, timedOut=false, durationMs=1614, command=npm run workflow:public-guide-deployed-check
Notes: Published the guide-browser timing instrumentation and optimized guide evidence artifacts.
