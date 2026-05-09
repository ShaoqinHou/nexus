#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = findRoot(process.cwd());
const BASELINE = join(ROOT, '.codex', 'workflow', 'dependency-audit-baseline.json');

function findRoot(start) {
  let dir = resolve(start);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.codex')) || existsSync(join(dir, 'package.json'))) return dir;
    dir = dirname(dir);
  }
  return resolve(start);
}

function parseArgs(argv) {
  return {
    quiet: argv.includes('--quiet'),
    json: argv.includes('--json'),
  };
}

function loadJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function severityRank(severity) {
  return { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }[String(severity || '').toLowerCase()] ?? 0;
}

function allowedMap(baseline) {
  return new Map((baseline.allowed || []).map((item) => [item.name, item]));
}

function isExpired(date) {
  return !date || Date.parse(`${date}T23:59:59.999Z`) < Date.now();
}

function sorted(values) {
  return [...new Set((values || []).map(String))].sort();
}

function viaNames(via = []) {
  return via.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean);
}

function viaSources(via = []) {
  return via.map((item) => typeof item === 'object' ? item?.source : null).filter((source) => source !== null && source !== undefined).map(Number);
}

function rootAdvisorySources(vulnerability, vulnerabilities = {}, seen = new Set()) {
  if (!vulnerability || seen.has(vulnerability.name)) return [];
  seen.add(vulnerability.name);
  const direct = viaSources(vulnerability.via);
  const indirect = viaNames(vulnerability.via)
    .flatMap((name) => rootAdvisorySources(vulnerabilities[name], vulnerabilities, seen));
  return [...new Set([...direct, ...indirect])].sort((a, b) => a - b);
}

function sameSet(actual, expected) {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected));
}

function allowanceProblems(vulnerability, allowance, vulnerabilities = {}) {
  const problems = [];
  const name = vulnerability.name;
  if (allowance.severity !== vulnerability.severity) problems.push(`${name} baseline severity ${allowance.severity} does not match audit severity ${vulnerability.severity}.`);
  if (isExpired(allowance.expiresAt)) problems.push(`${name} baseline expired on ${allowance.expiresAt || '(missing date)'}.`);
  if (!allowance.reason || !allowance.followUp) problems.push(`${name} baseline needs reason and followUp.`);
  if (!Array.isArray(allowance.nodes) || !sameSet(vulnerability.nodes, allowance.nodes)) {
    problems.push(`${name} baseline nodes do not match audit nodes. Expected ${JSON.stringify(allowance.nodes || [])}, got ${JSON.stringify(vulnerability.nodes || [])}.`);
  }
  if (!Array.isArray(allowance.via) || !sameSet(viaNames(vulnerability.via), allowance.via)) {
    problems.push(`${name} baseline via chain does not match audit via. Expected ${JSON.stringify(allowance.via || [])}, got ${JSON.stringify(viaNames(vulnerability.via))}.`);
  }
  if (!Array.isArray(allowance.advisorySources) || !sameSet(rootAdvisorySources(vulnerability, vulnerabilities), allowance.advisorySources)) {
    problems.push(`${name} baseline advisory sources do not match audit advisory sources. Expected ${JSON.stringify(allowance.advisorySources || [])}, got ${JSON.stringify(rootAdvisorySources(vulnerability, vulnerabilities))}.`);
  }
  if (!Array.isArray(allowance.effects) || !sameSet(vulnerability.effects, allowance.effects)) {
    problems.push(`${name} baseline effects do not match audit effects. Expected ${JSON.stringify(allowance.effects || [])}, got ${JSON.stringify(vulnerability.effects || [])}.`);
  }
  if (Object.hasOwn(allowance, 'isDirect') && Boolean(vulnerability.isDirect) !== Boolean(allowance.isDirect)) {
    problems.push(`${name} baseline directness does not match audit directness.`);
  }
  return problems;
}

function auditProblems(report, baseline) {
  const allowed = allowedMap(baseline);
  const problems = [];
  const allowedFindings = [];
  const usedAllowances = new Set();

  if (isExpired(baseline.expiresAt)) {
    problems.push(`dependency audit baseline expired on ${baseline.expiresAt || '(missing date)'}.`);
  }

  for (const vulnerability of Object.values(report.vulnerabilities || {})) {
    const name = vulnerability.name;
    const severity = String(vulnerability.severity || 'unknown');
    const rank = severityRank(severity);
    const allowance = allowed.get(name);

    if (rank >= severityRank('high')) {
      problems.push(`${name} is ${severity}; high/critical advisories cannot be baselined.`);
      continue;
    }

    if (rank >= severityRank('moderate')) {
      if (!allowance) {
        problems.push(`${name} is ${severity} and is not in .codex/workflow/dependency-audit-baseline.json.`);
        continue;
      }
      problems.push(...allowanceProblems(vulnerability, allowance, report.vulnerabilities || {}));
      usedAllowances.add(name);
      allowedFindings.push({ name, severity, reason: allowance.reason });
    }
  }

  for (const allowance of baseline.allowed || []) {
    if (!allowance?.name) {
      problems.push('dependency audit baseline contains an allowance without a name.');
      continue;
    }
    if (!usedAllowances.has(allowance.name)) {
      problems.push(`${allowance.name} baseline allowance is unused by current npm audit output; remove stale dependency-audit exceptions instead of carrying dormant allowances.`);
    }
  }

  return { problems, allowedFindings };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm audit --audit-level=moderate --json'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    : spawnSync('npm', ['audit', '--audit-level=moderate', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    });
  const report = loadJsonFromText(result.stdout, null);
  if (!report) {
    console.error('dependency audit failed: npm did not return JSON.');
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(result.status || 1);
  }

  const baseline = loadJson(BASELINE, { allowed: [] });
  const { problems, allowedFindings } = auditProblems(report, baseline);
  const metadata = report.metadata?.vulnerabilities || {};
  const summary = {
    vulnerabilities: metadata,
    allowed: allowedFindings.map((finding) => finding.name),
    problems,
  };

  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else if (!args.quiet) {
    console.log(`dependency audit: ${problems.length ? 'fail' : 'pass'}`);
    console.log(`vulnerabilities: ${JSON.stringify(metadata)}`);
    for (const finding of allowedFindings) console.log(`allowed ${finding.severity}: ${finding.name}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }

  process.exit(problems.length ? 1 : 0);
}

function loadJsonFromText(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

main();
