#!/usr/bin/env node

const DEFAULT_WORKFLOW_URL = 'https://cv.rehou.games/nexus/workflow/';

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

async function main() {
  const workflowUrl = process.env.NEXUS_PUBLIC_WORKFLOW_URL || process.argv[2] || DEFAULT_WORKFLOW_URL;
  const baseUrl = workflowUrl.endsWith('/') ? workflowUrl : `${workflowUrl}/`;
  const zooUrl = new URL('zoo/', baseUrl).href;

  const guide = await fetchText(baseUrl, 'workflow guide');
  for (const required of ['Nexus Workflow Guide', 'Visual Zoo/Gym Guide']) {
    if (!guide.text.includes(required)) throw new Error(`workflow guide missing required content: ${required}`);
  }

  const zoo = await fetchText(zooUrl, 'visual Zoo/Gym guide');
  for (const required of ['Nexus Design Zoo / Gym', 'Visual Demo Surface']) {
    if (!zoo.text.includes(required)) throw new Error(`visual Zoo/Gym guide missing required content: ${required}`);
  }

  const images = imageSources(zoo.text, zooUrl);
  if (images.length < 50) throw new Error(`visual Zoo/Gym guide has too few image references: ${images.length}`);

  const results = await Promise.all(images.map(async (url) => {
    const response = await fetch(url);
    return { url, status: response.status, ok: response.ok };
  }));
  const broken = results.filter((result) => !result.ok);
  if (broken.length) {
    const sample = broken.slice(0, 5).map((result) => `${result.status} ${result.url}`).join('; ');
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
