---
schema: "nexus-test/v1"
id: "TEST-20260508T170615Z-spark-worker-toast-warning-slice"
created: "2026-05-08T17:06:15.647Z"
author: "codex"
---

# Spark worker toast warning slice

Spark worker Hooke implemented warning ToastData type, warning icon/classes, zoo warning demo, registry propsShape, and focused Toast test. Lead review added adjacent fix for info toasts to use bg-info-light/text-info/border-info instead of primary tokens. Targeted test passed: npm run test --workspace=packages/web -- src/components/ui/__tests__/Toast.test.tsx (2 tests). lint:design:quiet and workflow validate passed.
