---
schema: "nexus-test/v1"
id: "TEST-20260508T171820Z-server-pre-deploy-validation"
created: "2026-05-08T17:18:20.443Z"
author: "codex"
---

# Server pre-deploy validation

SSH read-only check succeeded for root@134.199.148.87 using ~/.ssh/DIOkii. Server repo /root/monoWeb/nexus exists at commit 1cbd123 on main with package-lock.json modified. systemd nexus-api is active; ExecStart=/usr/bin/npx tsx packages/api/src/index.ts; port 3010 listening. Hosted web https://cv.rehou.games/nexus/ returned 200. API health https://cv.rehou.games/nexus/api/platform/health returned 200; /nexus/api/health returned 404 because health lives under /api/platform/health.
