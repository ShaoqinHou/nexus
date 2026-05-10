---
schema: "nexus-template/v1"
name: "guide-browser"
---

# Guide Browser Validation

Body reference only. Create durable records with `npm run workflow:guide-browser-finalize` or `record-guide-browser ...` so guide hashes and artifact hashes are generated.

Use this evidence when `.codex/dashboard/index.html` or `.codex/dashboard/public.html` is regenerated for release.

Record with:

```bash
npm run workflow:guide-browser-finalize
```

Required evidence:

- deterministic checks for the rendered target, such as title, key text, link targets, image count, broken image count, and relevant HTTP status,
- `summary.json` with target URL or file URL, viewport, title, image count, and broken image count,
- representative desktop and mobile screenshot previews for the internal dashboard, public guide, and visual Zoo/Gym guide,
- confirmation that the workflow guide links the visual Zoo/Gym guide,
- confirmation that the Zoo/Gym guide renders its expected screenshots,
- note any browser or screenshot capture limitation.

Screenshot format:

- JPEG previews are acceptable for broad page-render evidence when deterministic checks prove the claim.
- Use PNG or another lossless artifact for pixel comparison, visual regression baselines, exact color/token debugging, or small UI crops.
- Prefer viewport screenshots for validation evidence. Use full-page screenshots only when the full-page layout is itself the claim.
