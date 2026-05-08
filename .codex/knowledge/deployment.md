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

## Deployment Shape

The server copy should be updated through the real repo and static assets copied into the nginx-served folder. The API service then restarts.

Server validation must confirm:

- `/root/monoWeb/nexus` has the intended commit or files.
- `/var/www/cv.rehou.games/nexus/` has fresh built assets.
- `systemctl status nexus-api` is healthy after restart.
- `https://cv.rehou.games/nexus/` returns HTML.
- `https://cv.rehou.games/nexus/api/platform/health` returns 200.

Known risk: do not skip production `db:push` when schema changes are present.

Known server state on 2026-05-09:

- `/root/monoWeb/nexus` was at commit `1cbd123` on `main`.
- `nexus-api` was active on port `3010`.
- The server worktree had an existing `package-lock.json` modification. Do not overwrite it blindly during deployment.
