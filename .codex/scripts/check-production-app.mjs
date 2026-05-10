#!/usr/bin/env node
import { findWorkflowRoot, loadCodexWorkflow, requiredPolicyString } from './workflow-engine.mjs';

const ROOT = findWorkflowRoot(process.cwd());
const WORKFLOW = loadCodexWorkflow(ROOT);
const appUrl = normalizeUrl(requiredPolicyString(WORKFLOW, 'deployment', 'publicAppUrl'));
const apiHealthUrl = requiredPolicyString(WORKFLOW, 'deployment', 'apiHealthUrl');
const publicAssetPrefix = requiredPolicyString(WORKFLOW, 'deployment', 'publicAssetPrefix');

async function fetchText(url, label) {
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} returned ${response.status}: ${url}`);
  return { response, text };
}

function normalizeUrl(value) {
  return String(value || '').endsWith('/') ? String(value || '') : `${String(value || '')}/`;
}

async function main() {
  const app = await fetchText(appUrl, 'public app');
  const contentType = app.response.headers.get('content-type') || '';
  if (!/text\/html/i.test(contentType)) throw new Error(`public app did not return HTML: ${contentType || '(missing content-type)'}`);
  if (!/<div[^>]+id=["']root["']/i.test(app.text)) throw new Error('public app HTML does not contain the expected React root.');
  if (!app.text.includes(publicAssetPrefix)) {
    throw new Error(`public app HTML does not reference ${publicAssetPrefix}; deployment may have been built with the wrong base path.`);
  }

  const health = await fetchText(apiHealthUrl, 'API health');
  let parsed = {};
  try {
    parsed = JSON.parse(health.text);
  } catch {
    throw new Error(`API health did not return JSON: ${health.text.slice(0, 120)}`);
  }
  if (!parsed.ok && parsed.status !== 'ok') throw new Error(`API health JSON was not healthy: ${health.text.slice(0, 200)}`);

  console.log(`production app ok: ${appUrl}`);
  console.log(`production API health ok: ${apiHealthUrl}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
