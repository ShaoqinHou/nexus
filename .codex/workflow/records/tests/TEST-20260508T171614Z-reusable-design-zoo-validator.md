---
schema: "nexus-test/v1"
id: "TEST-20260508T171614Z-reusable-design-zoo-validator"
created: "2026-05-08T17:16:14.481Z"
author: "codex"
---

# Reusable design-zoo validator

Added npm run workflow:design-zoo. First run failed because getByRole('link', { name: 'Toast' }) also matched AddToCartToast; fixed with exact: true. Final run passed against http://127.0.0.1:5173: active toasts=5, html.dark=1, selectedTheme=sichuan, warningVisible=true.
