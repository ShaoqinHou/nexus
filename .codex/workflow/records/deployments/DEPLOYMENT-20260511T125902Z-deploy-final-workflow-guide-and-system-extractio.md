---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260511T125902Z-deploy-final-workflow-guide-and-system-extractio"
created: "2026-05-11T12:59:02.236Z"
target: "https://cv.rehou.games/nexus/"
verdict: "pass"
operator: "codex-lead"
workSliceIds: ["WORK-SLICE-20260511T101600Z-work-slice-active-research-design-implement-and-"]
commandIds: ["wf-deploy-update-faafd98","wf-deploy-production-app-faafd98","wf-deploy-public-guide-faafd98"]
commandEvidence: [{"id":"wf-deploy-update-faafd98","command":["ssh","-i","C:\\Users\\housh\\.ssh\\DIOkii","-o","StrictHostKeyChecking=accept-new","configured SSH endpoint","set -e; cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && echo server-after && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && git status --short && mkdir -p /var/www/cv.rehou.games/nexus/workflow && rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo && mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo && cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html && cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/ && test -f /var/www/cv.rehou.games/nexus/workflow/index.html && test -f /var/www/cv.rehou.games/nexus/workflow/zoo/index.html && systemctl is-active nexus-api"],"cwd":".","startedAt":"2026-05-11T12:58:33.076Z","endedAt":"2026-05-11T12:58:35.199Z","durationMs":2122,"timeoutMs":600000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-deploy-production-app-faafd98","command":["npm","run","workflow:production-app-check"],"cwd":".","startedAt":"2026-05-11T12:58:46.426Z","endedAt":"2026-05-11T12:58:47.139Z","durationMs":712,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"wf-deploy-public-guide-faafd98","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-11T12:58:47.525Z","endedAt":"2026-05-11T12:58:49.082Z","durationMs":1556,"timeoutMs":240000,"exitCode":0,"timedOut":false,"warned":false}]
checks: ["server repo fast-forwarded to faafd98; public workflow guide and Zoo/Gym guide copied to nginx path; nexus-api active; production app/API health passed; deployed guide and 58 Zoo/Gym images passed hash checks"]
artifacts: []
artifactEvidence: []
guideArtifactHash: "3a15e91e1e023d0bf5bd4903"
guideArtifacts: {"publicGuideUrl":"https://cv.rehou.games/nexus/workflow/","visualZooGuideUrl":"https://cv.rehou.games/nexus/workflow/zoo/","artifactHash":"3a15e91e1e023d0bf5bd4903","files":[{"file":"public.html","sha256":"6ea30b32a2c446ede526c86ef431a537d9cf2439ff6ffe9a7f79b713506cd4d8","bytes":224207,"version":"nexus-public-workflow-guide/v2","sourceHash":"0108a1a3310a294a738edbbc","recordFeedHash":"da181b955183c4d3bba77f8c","contentHash":"3ceab771b69f94915158b7f4"},{"file":"zoo/index.html","sha256":"95dfa3e1f84aa75cd261172e087ccbf199bdc6a900caec99181d2a8bf0f4d972","bytes":57373,"version":"nexus-design-zoo-visual-guide/v1","sourceHash":"a1af1a121168a1648e96e152","recordFeedHash":"","contentHash":"469f210cbd6ca06019556b65"},{"file":"zoo/manifest.json","sha256":"c51dba5063781a61be2127c29a3366ef61128204f4024643abad0273991d581b","bytes":55315,"version":"","sourceHash":"","recordFeedHash":"","contentHash":""}]}
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "f645db4faedc26e2"
---

# Deploy final workflow guide and system extraction records

Target: https://cv.rehou.games/nexus/
Verdict: pass
Operator: codex-lead
Branch evidence hash: f645db4faedc26e2
Work slices: WORK-SLICE-20260511T101600Z-work-slice-active-research-design-implement-and-
Command run ids: wf-deploy-update-faafd98, wf-deploy-production-app-faafd98, wf-deploy-public-guide-faafd98
Checks: server repo fast-forwarded to faafd98; public workflow guide and Zoo/Gym guide copied to nginx path; nexus-api active; production app/API health passed; deployed guide and 58 Zoo/Gym images passed hash checks
Guide artifact hash: 3a15e91e1e023d0bf5bd4903
Command evidence:
- wf-deploy-update-faafd98: exit 0, timedOut=false, durationMs=2122, command=ssh -i C:\Users\housh\.ssh\DIOkii -o StrictHostKeyChecking=accept-new configured SSH endpoint set -e; cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && echo server-after && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && git status --short && mkdir -p /var/www/cv.rehou.games/nexus/workflow && rm -rf /var/www/cv.rehou.games/nexus/workflow/zoo && mkdir -p /var/www/cv.rehou.games/nexus/workflow/zoo && cp .codex/dashboard/public.html /var/www/cv.rehou.games/nexus/workflow/index.html && cp -a .codex/dashboard/zoo/. /var/www/cv.rehou.games/nexus/workflow/zoo/ && test -f /var/www/cv.rehou.games/nexus/workflow/index.html && test -f /var/www/cv.rehou.games/nexus/workflow/zoo/index.html && systemctl is-active nexus-api
- wf-deploy-production-app-faafd98: exit 0, timedOut=false, durationMs=712, command=npm run workflow:production-app-check
- wf-deploy-public-guide-faafd98: exit 0, timedOut=false, durationMs=1556, command=npm run workflow:public-guide-deployed-check
Notes: Server still has existing packages/web/tsconfig.tsbuildinfo modification; deployment did not overwrite it.
