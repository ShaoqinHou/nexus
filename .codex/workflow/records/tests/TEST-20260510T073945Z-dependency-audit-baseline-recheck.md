---
schema: "nexus-test/v1"
id: "TEST-20260510T073945Z-dependency-audit-baseline-recheck"
created: "2026-05-10T07:39:45.419Z"
author: "codex"
---

# Dependency audit baseline recheck

Rechecked dependency audit baseline on 2026-05-10. Timed command local-dependency-audit-recheck-20260510 ran npm run audit:deps and passed in 2568ms with 0 high/critical findings and 4 moderate findings, all matching the explicit Drizzle CLI baseline. npm view drizzle-kit version returned 0.31.10, matching the installed latest version. npm ls confirmed the vulnerable esbuild path remains nested under drizzle-kit -> @esbuild-kit/esm-loader -> @esbuild-kit/core-utils -> esbuild@0.18.20; app build/runtime esbuild versions are patched.
