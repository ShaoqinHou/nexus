---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260511T055417Z-deploy-workflow-data-taxonomy-guide-update"
created: "2026-05-11T05:54:17.513Z"
target: "https://cv.rehou.games/nexus/"
verdict: "pass"
operator: "codex-lead"
workSliceIds: ["WORK-SLICE-20260511T012455Z-work-slice-done-finish-nexus-design-system-parit","WORK-SLICE-20260511T040309Z-work-slice-done-audit-and-improve-workflow-porta","WORK-SLICE-20260511T054117Z-work-slice-done-audit-codex-workflow-role-bounda"]
commandIds: ["data-shape-server-guide-sync-20260511","data-shape-production-app-check-20260511","data-shape-public-guide-deployed-check-20260511"]
commandEvidence: [{"id":"data-shape-server-guide-sync-20260511","command":["ssh","-i","C:/Users/housh/.ssh/DIOkii","configured SSH endpoint","bash -lc 'set -e; cd server repo; git fetch origin codex/native-workflow; git checkout codex/native-workflow; git pull --ff-only origin codex/native-workflow; git rev-parse --short HEAD; mkdir -p /var/www/cv.rehou.games/nexus/workflow; cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html; rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo; mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo; cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/; systemctl is-active nexus-api; git rev-parse --short HEAD'"],"cwd":".","startedAt":"2026-05-11T05:52:38.196Z","endedAt":"2026-05-11T05:52:40.479Z","durationMs":2282,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false},{"id":"data-shape-production-app-check-20260511","command":["npm","run","workflow:production-app-check"],"cwd":".","startedAt":"2026-05-11T05:52:51.640Z","endedAt":"2026-05-11T05:52:52.318Z","durationMs":677,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"data-shape-public-guide-deployed-check-20260511","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-11T05:52:51.645Z","endedAt":"2026-05-11T05:52:53.230Z","durationMs":1584,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false}]
checks: ["Server repo fast-forwarded to d8fbc8f","public guide copied to /var/www/cv.rehou.games/nexus/workflow","nexus-api active","production app/API ok","public workflow guide and 58 Zoo/Gym images loaded"]
artifacts: []
artifactEvidence: []
guideArtifactHash: "9d99199c588103427f4e4807"
guideArtifacts: {"publicGuideUrl":"https://cv.rehou.games/nexus/workflow/","visualZooGuideUrl":"https://cv.rehou.games/nexus/workflow/zoo/","artifactHash":"9d99199c588103427f4e4807","files":[{"file":"public.html","sha256":"c7c449a5a6b77374992fc28e9ac6e8ee89a881f9f2fcf680ca8479f623cf0b42","bytes":179673,"version":"nexus-public-workflow-guide/v2","sourceHash":"0f7b426adc84ecc5736f7b88","recordFeedHash":"d5a143f2c7014502687cf7ac","contentHash":"6125af88c8e3019841100480"},{"file":"zoo/index.html","sha256":"e8ea4dfb49cae3f86807c4f32f6702b251b8c90e3ecea218599263f0fa93640f","bytes":57373,"version":"nexus-design-zoo-visual-guide/v1","sourceHash":"cc5292826150b1afa1e0373d","recordFeedHash":"","contentHash":"39822e6721900ed30d93e9ee"},{"file":"zoo/manifest.json","sha256":"c51dba5063781a61be2127c29a3366ef61128204f4024643abad0273991d581b","bytes":55315,"version":"","sourceHash":"","recordFeedHash":"","contentHash":""}]}
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "46706aae14f38b2c"
---

# Deploy workflow data taxonomy guide update

Target: https://cv.rehou.games/nexus/
Verdict: pass
Operator: codex-lead
Branch evidence hash: 46706aae14f38b2c
Work slices: WORK-SLICE-20260511T012455Z-work-slice-done-finish-nexus-design-system-parit, WORK-SLICE-20260511T040309Z-work-slice-done-audit-and-improve-workflow-porta, WORK-SLICE-20260511T054117Z-work-slice-done-audit-codex-workflow-role-bounda
Command run ids: data-shape-server-guide-sync-20260511, data-shape-production-app-check-20260511, data-shape-public-guide-deployed-check-20260511
Checks: Server repo fast-forwarded to d8fbc8f, public guide copied to /var/www/cv.rehou.games/nexus/workflow, nexus-api active, production app/API ok, public workflow guide and 58 Zoo/Gym images loaded
Guide artifact hash: 9d99199c588103427f4e4807
Command evidence:
- data-shape-server-guide-sync-20260511: exit 0, timedOut=false, durationMs=2282, command=ssh -i C:/Users/housh/.ssh/DIOkii configured SSH endpoint bash -lc 'set -e; cd server repo; git fetch origin codex/native-workflow; git checkout codex/native-workflow; git pull --ff-only origin codex/native-workflow; git rev-parse --short HEAD; mkdir -p /var/www/cv.rehou.games/nexus/workflow; cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html; rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo; mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo; cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/; systemctl is-active nexus-api; git rev-parse --short HEAD'
- data-shape-production-app-check-20260511: exit 0, timedOut=false, durationMs=677, command=npm run workflow:production-app-check
- data-shape-public-guide-deployed-check-20260511: exit 0, timedOut=false, durationMs=1584, command=npm run workflow:public-guide-deployed-check
Notes: Published the workflow guide and visual Zoo/Gym guide for the workflow data-shape taxonomy update. The server retained its known local packages/web/tsconfig.tsbuildinfo modification; the fast-forward and guide copy still completed.
