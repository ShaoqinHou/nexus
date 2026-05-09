---
schema: "nexus-template/v1"
name: "guide-browser"
---

# Guide Browser Validation

Use this evidence when `.codex/dashboard/index.html` or `.codex/dashboard/public.html` is regenerated for release.

Record with:

```bash
node .codex/scripts/nexus-workflow.mjs record-guide-browser --verdict pass --reviewer <name> --screenshots "path1,path2" --notes "<desktop/mobile browser checks>"
```

Required evidence:

- public guide desktop screenshot,
- public guide mobile screenshot,
- internal dashboard desktop screenshot,
- internal dashboard mobile screenshot,
- confirmation that `/design` / Zoo-Gym links and record counts render,
- note any browser or screenshot capture limitation.
