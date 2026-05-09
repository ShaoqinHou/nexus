---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260509T020848Z-public-workflow-guide-deployed"
created: "2026-05-09T02:08:48.861Z"
author: "codex-lead"
---

# Public workflow guide deployed

Published .codex/dashboard/public.html to /var/www/cv.rehou.games/nexus/workflow/index.html on the server. Validated https://cv.rehou.games/nexus/workflow/ returned 200, https://cv.rehou.games/nexus/ returned 200, and https://cv.rehou.games/nexus/api/platform/health returned 200. Server branch HEAD b026491, node --check .codex/scripts/nexus-workflow.mjs passed, node .codex/scripts/nexus-workflow.mjs validate passed, and handover-check returned 0 problems. Public guide content included Nexus Workflow Guide, Spark Worker, and Strong Worker; checked no matches for DIOkii, 134.199.148.87, /root/monoWeb, root@, or deploy-backups. Server worktree remained clean except pre-existing package-lock.json.
