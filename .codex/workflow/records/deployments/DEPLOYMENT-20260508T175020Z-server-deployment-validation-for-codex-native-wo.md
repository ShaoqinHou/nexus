---
schema: "nexus-deployment/v1"
id: "DEPLOYMENT-20260508T175020Z-server-deployment-validation-for-codex-native-wo"
created: "2026-05-08T17:50:20.520Z"
author: "codex-lead"
---

# Server deployment validation for Codex-native workflow

Validated on 2026-05-09. Pushed branch codex/native-workflow and deployed commit cf069ce to /root/monoWeb/nexus on 134.199.148.87. Server workflow validate passed. Initial production build failed because node_modules was stale and missing @fontsource-variable/fraunces; npm ci fixed it. Initial npm run build produced root /assets URLs; corrected by rebuilding packages/web with npx vite build --base /nexus/. Synced packages/web/dist to /var/www/cv.rehou.games/nexus, restarted nexus-api, service active. Hosted checks: https://cv.rehou.games/nexus/ returned 200, https://cv.rehou.games/nexus/api/platform/health returned 200, deployed index referenced /nexus/assets/ and asset assets/index-BXPaLsHH.js. Preserved pre-existing dirty package-lock.json; backup diff saved on server at /root/monoWeb/deploy-backups/nexus/package-lock-local-20260509-codex-native-workflow.diff. Server npm ci reported audit findings; not remediated in this migration.
