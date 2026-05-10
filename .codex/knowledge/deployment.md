# Deployment Knowledge

Primary production target discovered from the neighboring monoWeb root:

- Public app: `https://cv.rehou.games/nexus/`
- Server: `134.199.148.87`
- SSH user: `root`
- SSH key: `~/.ssh/DIOkii`
- Server repo path: `/root/monoWeb/nexus`
- Static frontend path: `/var/www/cv.rehou.games/nexus/`
- API systemd service: `nexus-api`
- Production API port: `3010`

Do not print secrets or private key material.

## Local Commands

```bash
npm install
npm run db:push
npm run db:seed
npm run dev:all
npm test
npm run build
npm run lint:design
bash scripts/smoke-test.sh
```

## Production Build

The frontend is served from `/nexus/`, so production Vite builds must use:

```bash
cd packages/web
MSYS_NO_PATHCONV=1 npx vite build --base /nexus/
```

Server evidence on 2026-05-09 confirmed why this matters: a plain `npm run build` produced root `/assets/` URLs in the deployed HTML. The corrected deployment rebuilt with `npx vite build --base /nexus/`, after which `/var/www/cv.rehou.games/nexus/index.html` referenced `/nexus/assets/`.

## Deployment Shape

The server copy should be updated through the real repo and static assets copied into the nginx-served folder. The API service then restarts.

Server validation must confirm:

- `/root/monoWeb/nexus` has the intended commit or files.
- `/var/www/cv.rehou.games/nexus/` has fresh built assets.
- `systemctl status nexus-api` is healthy after restart.
- `https://cv.rehou.games/nexus/` returns HTML.
- `https://cv.rehou.games/nexus/api/platform/health` returns 200.
- When publishing the workflow guide, `https://cv.rehou.games/nexus/workflow/` returns the expected guide and `https://cv.rehou.games/nexus/workflow/zoo/` returns the visual Zoo/Gym guide with all referenced screenshot images loading successfully.

After validating the server, record deployment evidence and run the deployed gate:

```bash
npm run workflow:run -- --id <app-check-id> --timeout-ms 120000 -- npm run workflow:production-app-check
npm run workflow:run -- --id <guide-check-id> --timeout-ms 180000 -- npm run workflow:public-guide-deployed-check
node .codex/scripts/nexus-workflow.mjs record-deployment --summary "<deployment>" --target "https://cv.rehou.games/nexus/" --verdict pass --operator <lead-worker> --commands "<app-check-id>,<guide-check-id>" --checks "<health/assets/log checks>" --notes "<server result>"
npm run workflow:deployed-gate
```

Use `npm run workflow:run` for SSH, curl, and smoke-check commands that should become deployment proof. The deployment record embeds compact summaries for those command ids. `--checks` is descriptive context; it does not replace command evidence or durable artifacts for a passing deployment record.

The deployed gate requires both app/API proof and workflow-guide proof when guide artifacts changed. `workflow:production-app-check` validates the app root and API health. `workflow:public-guide-deployed-check` validates the public workflow guide, the Zoo/Gym guide, the deployed manifest, and every referenced screenshot image hash.

`npm run workflow:release-gate` is local branch readiness. It does not prove the server was updated.

## Workflow Guide URL

The public-safe workflow guide is deployed to:

- `https://cv.rehou.games/nexus/workflow/`
- `https://cv.rehou.games/nexus/workflow/zoo/` for the deployable visual Zoo/Gym guide

Generate it with:

```bash
npm run workflow:public-guide
npm run workflow:zoo-visual-guide
```

Deploy it by copying `.codex/dashboard/public.html` to `/var/www/cv.rehou.games/nexus/workflow/index.html` and `.codex/dashboard/zoo/` to `/var/www/cv.rehou.games/nexus/workflow/zoo/`. Do not publish the full repo-local `.codex/dashboard/index.html` unless intentionally exposing internal deployment paths and record excerpts.

Workflow-guide deployment checks should fetch the public Zoo/Gym HTML, extract screenshot image paths, request those image URLs, and fail if any return a non-2xx response. Counting `.jpg` references is not sufficient deployment proof.

Use the checked-in workflow command instead of an inline one-off script:

```bash
npm run workflow:public-guide-deployed-check
```

Known risk: do not skip production `db:push` when schema changes are present.

Known server state on 2026-05-09:

- Before this migration deployment, `/root/monoWeb/nexus` was at commit `1cbd123` on `main`.
- After deployment validation, `/root/monoWeb/nexus` was on branch `codex/native-workflow` at commit `cf069ce`.
- `nexus-api` was active on port `3010`.
- The server worktree had an existing `package-lock.json` modification. Do not overwrite it blindly during deployment.
- Server `node_modules` was stale and missing `@fontsource-variable/fraunces`; `npm ci` fixed the install before the production build.
