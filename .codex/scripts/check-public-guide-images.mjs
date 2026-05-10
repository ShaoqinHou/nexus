#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  findWorkflowRoot,
  loadCodexWorkflow,
  publicSanitizerForbiddenStrings,
  requiredPolicyArray,
  requiredPolicyString,
  requiredProfileString,
} from './workflow-engine.mjs';

const ROOT = findWorkflowRoot(process.cwd());
const WORKFLOW = loadCodexWorkflow(ROOT);
const DEFAULT_WORKFLOW_URL = requiredPolicyString(WORKFLOW, 'deployment', 'publicGuideUrl');
const GUIDE_META = WORKFLOW.policy.guide?.metaNames || {};
const DESIGN_POLICY = WORKFLOW.policy.design || {};
const DASHBOARD = WORKFLOW.profile?.paths?.dashboardDir || '.codex/dashboard';
const ZOO_MANIFEST = WORKFLOW.profile?.paths?.zooGuideManifest || '.codex/dashboard/zoo/manifest.json';
const PUBLIC_WORKFLOW_URL_ENV = requiredProfileString(WORKFLOW, 'env.publicWorkflowUrl');

function absoluteUrl(src, base) {
  return new URL(src, base).href;
}

function imageSources(html, baseUrl) {
  return [...String(html).matchAll(/<img[^>]+src=["']([^"']+)["']/g)]
    .map((match) => absoluteUrl(match[1], baseUrl));
}

async function fetchText(url, label) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} returned ${response.status}: ${url}`);
  return { response, text };
}

async function fetchBytes(url, label) {
  const response = await fetch(url);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} returned ${response.status}: ${url}`);
  return { response, bytes };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function htmlMetaContent(html, name) {
  if (!name) return '';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (String(html).match(new RegExp(`<meta\\s+name=["']${escaped}["']\\s+content=["']([^"']+)["']\\s*\\/?>`, 'i'))?.[1] || '').trim();
}

function expectedMetaFor(relPath, names) {
  const path = join(ROOT, relPath);
  if (!existsSync(path)) throw new Error(`local guide artifact is missing: ${relPath}`);
  const html = readFileSync(path, 'utf8');
  return Object.fromEntries(names.map((key) => [key, htmlMetaContent(html, GUIDE_META[key])]));
}

function assertMetaMatches(label, remoteHtml, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (!value) throw new Error(`local ${label} has no ${key} meta`);
    const actual = htmlMetaContent(remoteHtml, GUIDE_META[key]);
    if (actual !== value) throw new Error(`${label} ${key} mismatch: deployed=${actual || '(missing)'} local=${value}`);
  }
}

function normalizeGuideUrl(value) {
  return String(value || '').endsWith('/') ? String(value || '') : `${String(value || '')}/`;
}

function forbiddenPublicStrings() {
  return publicSanitizerForbiddenStrings(WORKFLOW, ROOT);
}

function assertNoForbiddenPublicStrings(label, text) {
  for (const forbidden of forbiddenPublicStrings()) {
    if (String(text || '').includes(forbidden)) throw new Error(`${label} exposes forbidden public string: ${forbidden}`);
  }
}

function imageLooksLikeImage(contentType, bytes) {
  const typeOk = /^image\//i.test(contentType || '');
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP';
  return typeOk && (jpeg || png || webp);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node .codex/scripts/check-public-guide-images.mjs [workflow-guide-url]');
    console.log(`Default URL comes from .codex/workflow/policy/deployment.json: ${DEFAULT_WORKFLOW_URL}`);
    console.log(`Override env name comes from .codex/workflow/profile.json: ${PUBLIC_WORKFLOW_URL_ENV}`);
    return;
  }
  const urlArg = process.argv.slice(2).find((arg) => !arg.startsWith('-')) || '';
  const override = process.env[PUBLIC_WORKFLOW_URL_ENV] || urlArg || '';
  const workflowUrl = override || DEFAULT_WORKFLOW_URL;
  const baseUrl = normalizeGuideUrl(workflowUrl);
  const defaultUrl = normalizeGuideUrl(DEFAULT_WORKFLOW_URL);
  if (override && baseUrl !== defaultUrl) {
    throw new Error(`public guide deployment check target ${baseUrl} does not match deployment policy ${defaultUrl}; use the checked-in policy URL for release evidence.`);
  }
  const zooUrl = new URL('zoo/', baseUrl).href;
  const manifestUrl = new URL('manifest.json', zooUrl).href;

  const guide = await fetchText(baseUrl, 'workflow guide');
  const guideRequired = requiredPolicyArray(WORKFLOW, 'deployment', 'publicGuideRequiredStrings');
  for (const required of guideRequired) {
    if (!guide.text.includes(required)) throw new Error(`workflow guide missing required content: ${required}`);
  }
  assertNoForbiddenPublicStrings('workflow guide', guide.text);
  assertMetaMatches('workflow guide', guide.text, expectedMetaFor(`${DASHBOARD}/public.html`, ['version', 'sourceHash', 'recordFeedHash', 'contentHash', 'tokenSource']));

  const zoo = await fetchText(zooUrl, 'visual Zoo/Gym guide');
  const zooRequired = requiredPolicyArray(WORKFLOW, 'deployment', 'visualZooGuideRequiredStrings');
  for (const required of zooRequired) {
    if (!zoo.text.includes(required)) throw new Error(`visual Zoo/Gym guide missing required content: ${required}`);
  }
  assertNoForbiddenPublicStrings('visual Zoo/Gym guide', zoo.text);
  assertMetaMatches('visual Zoo/Gym guide', zoo.text, expectedMetaFor(`${DASHBOARD}/zoo/index.html`, ['version', 'sourceHash', 'contentHash', 'tokenSource']));

  const localManifestPath = join(ROOT, ZOO_MANIFEST);
  if (!existsSync(localManifestPath)) throw new Error(`local visual Zoo/Gym manifest is missing: ${ZOO_MANIFEST}`);
  const localManifest = JSON.parse(readFileSync(localManifestPath, 'utf8'));
  const remoteManifest = JSON.parse((await fetchText(manifestUrl, 'visual Zoo/Gym manifest')).text);
  const remoteManifestText = JSON.stringify(remoteManifest);
  if (remoteManifest.baseUrl) {
    throw new Error('deployed visual Zoo/Gym manifest exposes local capture URLs.');
  }
  assertNoForbiddenPublicStrings('visual Zoo/Gym manifest', remoteManifestText);
  const localManifestComparable = JSON.stringify(localManifest);
  const remoteManifestComparable = JSON.stringify(remoteManifest);
  if (remoteManifestComparable !== localManifestComparable) throw new Error('deployed visual Zoo/Gym manifest does not match the local public manifest.');

  const images = imageSources(zoo.text, zooUrl);
  const minImages = Number(DESIGN_POLICY.zooVisualMinImages);
  if (!Number.isFinite(minImages) || minImages <= 0) {
    throw new Error('Design workflow policy zooVisualMinImages must be a positive number.');
  }
  if (images.length < minImages) throw new Error(`visual Zoo/Gym guide has too few image references: ${images.length}; expected at least ${minImages}`);

  const expectedHashes = new Map((localManifest.targets || []).map((target) => [absoluteUrl(String(target.asset || '').replace(/^\.codex\/dashboard\/zoo\//, ''), zooUrl), target.sha256]));
  const results = await Promise.all(images.map(async (url) => {
    const { response, bytes } = await fetchBytes(url, 'visual Zoo/Gym image');
    const contentType = response.headers.get('content-type') || '';
    const hash = sha256(bytes);
    const expectedHash = expectedHashes.get(url);
    return {
      url,
      status: response.status,
      ok: response.ok,
      image: imageLooksLikeImage(contentType, bytes),
      contentType,
      hash,
      expectedHash,
      hashOk: expectedHash ? expectedHash === hash : false,
    };
  }));
  const broken = results.filter((result) => !result.ok || !result.image || !result.hashOk);
  if (broken.length) {
    const sample = broken.slice(0, 5).map((result) => `${result.status} image=${result.image} hashOk=${result.hashOk} ${result.contentType} ${result.url}`).join('; ');
    throw new Error(`visual Zoo/Gym guide has ${broken.length} broken image(s): ${sample}`);
  }

  console.log(`public workflow guide ok: ${baseUrl}`);
  console.log(`public visual Zoo/Gym guide ok: ${zooUrl}`);
  console.log(`visual Zoo/Gym images loaded: ${images.length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
