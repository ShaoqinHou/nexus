#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';

const ROOT = findRoot(process.cwd());
const DIST = join(ROOT, 'packages', 'web', 'dist');
const ASSETS = join(DIST, 'assets');

function findRoot(start) {
  let dir = resolve(start);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.codex')) || existsSync(join(dir, 'package.json'))) return dir;
    dir = dirname(dir);
  }
  return resolve(start);
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function main() {
  const problems = [];
  if (!existsSync(DIST) || !existsSync(join(DIST, 'index.html'))) {
    problems.push('packages/web/dist is missing; run npm run build before workflow:prod-zoo-bundle-check.');
  }
  if (!existsSync(ASSETS)) {
    problems.push('packages/web/dist/assets is missing; run npm run build before workflow:prod-zoo-bundle-check.');
  }
  if (problems.length) return fail(problems);

  const jsFiles = walk(ASSETS).filter((file) => file.endsWith('.js'));
  for (const file of jsFiles) {
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    if (/\/Zoo-[^/]+\.js$/i.test(rel)) problems.push(`production build emitted interactive Zoo chunk: ${rel}`);
    const text = readFileSync(file, 'utf8');
    for (const forbidden of ['@web/routes/__design/Zoo', 'DesignZooIndexPage', 'DesignZooSlugPage', 'Nexus Design System']) {
      if (text.includes(forbidden)) problems.push(`production bundle ${rel} contains dev Zoo marker ${forbidden}.`);
    }
  }

  if (problems.length) return fail(problems);
  console.log(`production Zoo bundle check: ok (${jsFiles.length} JS assets scanned)`);
}

function fail(problems) {
  console.error(`production Zoo bundle problems: ${problems.length}`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

main();
