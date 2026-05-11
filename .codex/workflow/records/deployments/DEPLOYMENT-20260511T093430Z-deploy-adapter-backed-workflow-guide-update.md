---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260511T093430Z-deploy-adapter-backed-workflow-guide-update"
created: "2026-05-11T09:34:30.407Z"
target: "https://cv.rehou.games/nexus/"
verdict: "pass"
operator: "codex-lead"
workSliceIds: ["WORK-SLICE-20260511T092322Z-work-slice-done-implement-behavior-preserving-wo"]
commandIds: ["server-status-before-adapter-refactor-20260511t0940","server-pull-adapter-refactor-20260511t0941","deploy-guide-adapter-refactor-retry2-20260511t0946","production-app-check-adapter-refactor-20260511t0947","public-guide-deployed-check-adapter-refactor-20260511t0947"]
commandEvidence: [{"id":"server-status-before-adapter-refactor-20260511t0940","command":["ssh","-i","C:/Users/housh/.ssh/DIOkii","-o","StrictHostKeyChecking=no","configured SSH endpoint","cd server repo && git status --short --branch && git rev-parse --short HEAD"],"cwd":".","startedAt":"2026-05-11T09:32:02.571Z","endedAt":"2026-05-11T09:32:03.606Z","durationMs":1034,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"server-pull-adapter-refactor-20260511t0941","command":["ssh","-i","C:/Users/housh/.ssh/DIOkii","-o","StrictHostKeyChecking=no","configured SSH endpoint","cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && git rev-parse --short HEAD && git status --short --branch"],"cwd":".","startedAt":"2026-05-11T09:32:36.952Z","endedAt":"2026-05-11T09:32:39.040Z","durationMs":2088,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"deploy-guide-adapter-refactor-retry2-20260511t0946","command":["ssh","-i","C:/Users/housh/.ssh/DIOkii","-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","configured SSH endpoint","set -e; cd server repo; target=/var/www/cv.rehou.games/nexus/workflow; test $target = /var/www/cv.rehou.games/nexus/workflow; mkdir -p $target; cp .codex/dashboard/public.html $target/index.html; zoo=$target/zoo; test $zoo = /var/www/cv.rehou.games/nexus/workflow/zoo; rm -rf -- $zoo; cp -a .codex/dashboard/zoo $target/zoo; find $target -maxdepth 3 -type f | wc -l"],"cwd":".","startedAt":"2026-05-11T09:33:50.543Z","endedAt":"2026-05-11T09:33:51.324Z","durationMs":781,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false},{"id":"production-app-check-adapter-refactor-20260511t0947","command":["npm","run","workflow:production-app-check"],"cwd":".","startedAt":"2026-05-11T09:34:00.770Z","endedAt":"2026-05-11T09:34:01.511Z","durationMs":741,"timeoutMs":120000,"exitCode":0,"timedOut":false,"warned":false},{"id":"public-guide-deployed-check-adapter-refactor-20260511t0947","command":["npm","run","workflow:public-guide-deployed-check"],"cwd":".","startedAt":"2026-05-11T09:34:13.788Z","endedAt":"2026-05-11T09:34:15.277Z","durationMs":1489,"timeoutMs":180000,"exitCode":0,"timedOut":false,"warned":false}]
checks: ["server repo /root/monoWeb/nexus fast-forwarded to 99bfb54; public guide copied to /var/www/cv.rehou.games/nexus/workflow/; production app/API health passed; deployed public guide and Zoo/Gym guide passed with 58 images loaded"]
artifacts: []
artifactEvidence: []
guideArtifactHash: "05d960900f40d30f8c017624"
guideArtifacts: {"publicGuideUrl":"https://cv.rehou.games/nexus/workflow/","visualZooGuideUrl":"https://cv.rehou.games/nexus/workflow/zoo/","artifactHash":"05d960900f40d30f8c017624","files":[{"file":"public.html","sha256":"5130658f67f53bfe686e9eb61f049cf29b66028ae2c1be114d69b8b3c5cdeb57","bytes":210653,"version":"nexus-public-workflow-guide/v2","sourceHash":"8e3b0b5c23b7f339d347a449","recordFeedHash":"0a39a8582803c616ca5a88cd","contentHash":"f486cdca766555a75ec8d2f1"},{"file":"zoo/index.html","sha256":"6c489af518f9d8c28f6c0ca0bb5a7021eb916e0b6893f23892687a0bd2af39f9","bytes":57373,"version":"nexus-design-zoo-visual-guide/v1","sourceHash":"1be5278d26cd5a093f3c00de","recordFeedHash":"","contentHash":"b34ba30b52885f3d17e647ff"},{"file":"zoo/manifest.json","sha256":"c51dba5063781a61be2127c29a3366ef61128204f4024643abad0273991d581b","bytes":55315,"version":"","sourceHash":"","recordFeedHash":"","contentHash":""}]}
branchBase: "origin/main"
branchMergeBase: "1cbd123e2ab368cb2ca5cf161ce2a38c4822179d"
branchHash: "479b39e250fb0814"
---

# Deploy adapter-backed workflow guide update

Target: https://cv.rehou.games/nexus/
Verdict: pass
Operator: codex-lead
Branch evidence hash: 479b39e250fb0814
Work slices: WORK-SLICE-20260511T092322Z-work-slice-done-implement-behavior-preserving-wo
Command run ids: server-status-before-adapter-refactor-20260511t0940, server-pull-adapter-refactor-20260511t0941, deploy-guide-adapter-refactor-retry2-20260511t0946, production-app-check-adapter-refactor-20260511t0947, public-guide-deployed-check-adapter-refactor-20260511t0947
Checks: server repo /root/monoWeb/nexus fast-forwarded to 99bfb54; public guide copied to /var/www/cv.rehou.games/nexus/workflow/; production app/API health passed; deployed public guide and Zoo/Gym guide passed with 58 images loaded
Guide artifact hash: 05d960900f40d30f8c017624
Command evidence:
- server-status-before-adapter-refactor-20260511t0940: exit 0, timedOut=false, durationMs=1034, command=ssh -i C:/Users/housh/.ssh/DIOkii -o StrictHostKeyChecking=no configured SSH endpoint cd server repo && git status --short --branch && git rev-parse --short HEAD
- server-pull-adapter-refactor-20260511t0941: exit 0, timedOut=false, durationMs=2088, command=ssh -i C:/Users/housh/.ssh/DIOkii -o StrictHostKeyChecking=no configured SSH endpoint cd server repo && git fetch origin codex/native-workflow && git checkout codex/native-workflow && git pull --ff-only origin codex/native-workflow && git rev-parse --short HEAD && git status --short --branch
- deploy-guide-adapter-refactor-retry2-20260511t0946: exit 0, timedOut=false, durationMs=781, command=ssh -i C:/Users/housh/.ssh/DIOkii -o StrictHostKeyChecking=no -o ConnectTimeout=30 configured SSH endpoint set -e; cd server repo; target=/var/www/cv.rehou.games/nexus/workflow; test $target = /var/www/cv.rehou.games/nexus/workflow; mkdir -p $target; cp .codex/dashboard/public.html $target/index.html; zoo=$target/zoo; test $zoo = /var/www/cv.rehou.games/nexus/workflow/zoo; rm -rf -- $zoo; cp -a .codex/dashboard/zoo $target/zoo; find $target -maxdepth 3 -type f | wc -l
- production-app-check-adapter-refactor-20260511t0947: exit 0, timedOut=false, durationMs=741, command=npm run workflow:production-app-check
- public-guide-deployed-check-adapter-refactor-20260511t0947: exit 0, timedOut=false, durationMs=1489, command=npm run workflow:public-guide-deployed-check
Notes: Initial guide-copy SSH attempt timed out and one retry had shell quoting error; retry2 succeeded. Server retained unrelated packages/web/tsconfig.tsbuildinfo modification noted before and after pull.
