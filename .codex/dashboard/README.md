# Workflow Dashboard

Generate the local dashboard with:

```bash
node .codex/scripts/nexus-workflow.mjs dashboard
```

Open `.codex/dashboard/index.html` in a browser. The generated HTML is a browser-friendly view over the markdown records and knowledge files; the markdown remains the source of truth.

The dashboard includes a Design Zoo/Gym section that links to the running app's dev-only `/design/*` routes. Start the web app before using those links:

```bash
npm run dev:web
```

Generate the public-safe guide with:

```bash
node .codex/scripts/nexus-workflow.mjs public-guide
```

The public guide is deployed at `https://cv.rehou.games/nexus/workflow/`. It intentionally omits internal deployment details and raw record bodies; use the repo-local dashboard for full workflow state.
