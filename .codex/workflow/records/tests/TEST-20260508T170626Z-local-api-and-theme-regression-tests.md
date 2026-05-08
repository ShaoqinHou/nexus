---
schema: "nexus-test/v1"
id: "TEST-20260508T170626Z-local-api-and-theme-regression-tests"
created: "2026-05-08T17:06:26.705Z"
author: "codex"
---

# Local API and theme regression tests

After npm ci, npm run test --workspace=packages/api passed 6 files / 187 tests. npm run test --workspace=packages/web -- src/platform/theme/__tests__/ThemeProvider.test.tsx passed 1 file / 11 tests; React emitted an existing act(...) warning in the live-preview ping-pong regression test but the test passed. npm run lint:design:quiet passed.
