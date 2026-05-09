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

Known risk: do not skip production `db:push` when schema changes are present.

Known server state on 2026-05-09:

- Before this migration deployment, `/root/monoWeb/nexus` was at commit `1cbd123` on `main`.
- After deployment validation, `/root/monoWeb/nexus` was on branch `codex/native-workflow` at commit `cf069ce`.
- `nexus-api` was active on port `3010`.
- The server worktree had an existing `package-lock.json` modification. Do not overwrite it blindly during deployment.
- Server `node_modules` was stale and missing `@fontsource-variable/fraunces`; `npm ci` fixed the install before the production build.
