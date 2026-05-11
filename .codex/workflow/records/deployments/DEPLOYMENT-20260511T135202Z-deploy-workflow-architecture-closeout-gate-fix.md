---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260511T135202Z-deploy-workflow-architecture-closeout-gate-fix"
created: "2026-05-11T13:52:02.981Z"
target: "https://cv.rehou.games/nexus/"
verdict: "pass"
operator: "codex-lead"
workSliceIds: ["WORK-SLICE-20260511T130957Z-work-slice-active-fix-guide-capability-gating-an"]
commandIds: ["wf-deploy-update-73250c9","wf-deploy-production-app-73250c9","wf-deploy-public-guide-73250c9"]
commandEvidence: [{"id":"wf-deploy-update-73250c9","command":["ssh","-i","C:\\Users\\housh\\.ssh\\DIOkii","-o","StrictHostKeyChecking=accept-new","configured SSH endpoint","set -e; cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && echo server-after && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && git status --short && mkdir -p /var/www/cv.rehou.games/nexus/workflow && rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo && mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo && cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html && cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/ && test -f /var/www/cv.rehou.games/nexus/workflow/index.html && test -f /var/www/cv.rehou.games/nexus/workflow/zoo/index.html && systemctl is-active nexus-api"],"cwd":".","startedAt":"2026-05-11T13:51:37.535Z","endedAt":"2026-05-11T13:51:39.773Z","durationMs":2238,"timeoutMs":600000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-deploy-production-app-73250c9","command":["npm","run","workflow:production-app-check"],"cwd":".","startedAt":"2026-05-11T13:51:49.538Z","endedAt":"2026-05-11T13:51:50.255Z","durationMs":717,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-deploy-public-guide-73250c9","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-11T13:51:49.536Z","endedAt":"2026-05-11T13:51:51.152Z","durationMs":1616,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false}]
checks: ["server repo fast-forwarded to 73250c9; public workflow guide and Zoo/Gym guide copied; nexus-api active; production app/API health passed; deployed guide and 58 Zoo/Gym images passed checks"]
artifacts: []
artifactEvidence: []
guideArtifactHash: "49e7f65591892b2168ef78cc"
guideArtifacts: {"publicGuideUrl":"https://cv.rehou.games/nexus/workflow/","visualZooGuideUrl":"https://cv.rehou.games/nexus/workflow/zoo/","artifactHash":"49e7f65591892b2168ef78cc","files":[{"file":"public.html","sha256":"876b219582f467c78057d204951dd5687c8b9151a29b9be6d05d9c16b37d51d2","bytes":228747,"version":"nexus-public-workflow-guide/v2","sourceHash":"62d4b8c82a13394e9f3a71e1","recordFeedHash":"4a57a5884d9cd01e09c183c0","contentHash":"1688e171ad004c51e246855e"},{"file":"zoo/index.html","sha256":"8ac26e08c3e8c106eaaa310c7c32219cea1357d067302065b1162f2a882a9267","bytes":57360,"version":"nexus-design-zoo-visual-guide/v1","sourceHash":"cb9e34e80374c6f011b61755","recordFeedHash":"","contentHash":"824b803aaf385c33717b98f1"},{"file":"zoo/manifest.json","sha256":"c51dba5063781a61be2127c29a3366ef61128204f4024643abad0273991d581b","bytes":55315,"version":"","sourceHash":"","recordFeedHash":"","contentHash":""}]}
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "ba88a28af22a6d4d"
---

# Deploy workflow architecture closeout gate fix

Target: https://cv.rehou.games/nexus/
Verdict: pass
Operator: codex-lead
Branch evidence hash: ba88a28af22a6d4d
Work slices: WORK-SLICE-20260511T130957Z-work-slice-active-fix-guide-capability-gating-an
Command run ids: wf-deploy-update-73250c9, wf-deploy-production-app-73250c9, wf-deploy-public-guide-73250c9
Checks: server repo fast-forwarded to 73250c9; public workflow guide and Zoo/Gym guide copied; nexus-api active; production app/API health passed; deployed guide and 58 Zoo/Gym images passed checks
Guide artifact hash: 49e7f65591892b2168ef78cc
Command evidence:
- wf-deploy-update-73250c9: exit 0, timedOut=false, durationMs=2238, command=ssh -i C:\Users\housh\.ssh\DIOkii -o StrictHostKeyChecking=accept-new configured SSH endpoint set -e; cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && echo server-after && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && git status --short && mkdir -p /var/www/cv.rehou.games/nexus/workflow && rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo && mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo && cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html && cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/ && test -f /var/www/cv.rehou.games/nexus/workflow/index.html && test -f /var/www/cv.rehou.games/nexus/workflow/zoo/index.html && systemctl is-active nexus-api
- wf-deploy-production-app-73250c9: exit 0, timedOut=false, durationMs=717, command=npm run workflow:production-app-check
- wf-deploy-public-guide-73250c9: exit 0, timedOut=false, durationMs=1616, command=npm run workflow:public-guide-deployed-check
Notes: Server retained existing packages/web/tsconfig.tsbuildinfo modification. This records deployment proof for branch hash ba88a28af22a6d4d after the post-audit workflow architecture fix.
