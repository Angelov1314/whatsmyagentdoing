'use strict';

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { homedir } = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const collectorFile = path.join(homedir(), 'Library', 'Application Support', 'Codex Token Dashboard', 'dashboard.py');
const maxResponseBytes = 8 * 1024 * 1024;
const reportStatusFields = ['running', 'scanned', 'total', 'skipped', 'unreadable', 'missing', 'invalid', 'updatedAt', 'error'];

function shanghaiDay(time) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(time)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDay(day, offset) {
  const [year, month, date] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + offset));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function aggregateUsage30(report, time) {
  const today = shanghaiDay(time);
  const cutoff = shiftDay(today, -29);
  const projects = new Set();
  let tokens = 0;
  let tokenOverflow = false;
  for (const row of report.rows) {
    if (!/^\d{4}-\d\d-\d\d$/.test(row[0]) || row[0] < cutoff || row[0] > today) continue;
    const total = row[4] + row[6];
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(tokens + total)) tokenOverflow = true;
    else tokens += total;
    if (row[3]) projects.add(row[3]);
  }
  return { tokens: tokenOverflow ? null : tokens, projects: projects.size };
}

function send(res, status, data) {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'same-origin',
  }).end(JSON.stringify(data));
}

function usageReport(data) {
  const { rows, projects, status, timezone, pricingDate } = data || {};
  if (!Array.isArray(rows) || !projects || typeof projects !== 'object' ||
      !status || typeof status.running !== 'boolean' || typeof timezone !== 'string' ||
      typeof pricingDate !== 'string') throw new Error('Invalid collector report');
  const namedProjects = new Map();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 11 || typeof row[0] !== 'string' ||
        !Number.isInteger(row[1]) || row[1] < 0 || row[1] > 23 ||
        typeof row[2] !== 'string' || typeof row[3] !== 'string' ||
        !row.slice(4, 9).every((value) => Number.isSafeInteger(value) && value >= 0) ||
        (row[9] !== null && (!Number.isFinite(row[9]) || row[9] < 0)) ||
        !Number.isSafeInteger(row[10]) || row[10] < 1) {
      throw new Error('Invalid collector usage row');
    }
    if (!namedProjects.has(row[3])) {
      const project = Object.hasOwn(projects, row[3]) ? projects[row[3]] : null;
      if (!project || typeof project.name !== 'string' || typeof project.path !== 'string') {
        throw new Error('Invalid collector project');
      }
      namedProjects.set(row[3], { name: project.name, path: project.path });
    }
  }
  return {
    rows, projects: Object.fromEntries(namedProjects), timezone, pricingDate,
    status: Object.fromEntries(reportStatusFields.filter((key) => Object.hasOwn(status, key))
      .map((key) => [key, status[key]])),
  };
}

function createCodexUsageBridge({ port = 8766, entry = collectorFile, launch, now = Date.now } = {}) {
  const origin = `http://127.0.0.1:${port}`;
  let starting;

  async function read(endpoint, method = 'GET', timeout = 4_000) {
    const response = await fetch(origin + endpoint, {
      method, redirect: 'error', signal: AbortSignal.timeout(timeout),
      headers: { accept: 'application/json', ...(method === 'POST' ? { origin } : {}) },
    });
    if (!(response.headers.get('content-type') || '').startsWith('application/json') ||
        Number(response.headers.get('content-length')) > maxResponseBytes) {
      await response.body?.cancel();
      throw new Error('Unexpected collector response');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxResponseBytes) throw new Error('Collector response too large');
      chunks.push(chunk);
    }
    return { status: response.status, data: JSON.parse(Buffer.concat(chunks, size).toString('utf8')) };
  }

  async function probe() {
    try {
      const health = await read('/api/health', 'GET', 700);
      if (health.status === 200 && health.data.app === 'codex-token-dashboard') return true;
      throw new Error('Unexpected usage service');
    } catch (error) {
      if (error.cause?.code === 'ECONNREFUSED') return false;
      throw error;
    }
  }

  function launchCollector() {
    const python = ['/opt/homebrew/bin/python3', '/usr/local/bin/python3'].find(fs.existsSync) || 'python3';
    const child = spawn(python, [entry, '--port', String(port)], {
      cwd: path.dirname(entry), stdio: 'ignore', detached: true,
    });
    child.on('error', () => {});
    child.unref();
  }

  function ensureReady() {
    starting ||= (async () => {
      if (await probe()) return;
      await (launch || launchCollector)();
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await delay(125);
        if (await probe()) return;
      }
      throw new Error('Usage collector did not start');
    })().finally(() => { starting = undefined; });
    return starting;
  }

  async function usageSummary() {
    if (!fs.existsSync(entry)) throw new Error('Usage collector unavailable');
    await ensureReady();
    const upstream = await read('/api/report', 'GET', 8_000);
    if (upstream.status !== 200) throw new Error('Usage report unavailable');
    return aggregateUsage30(usageReport(upstream.data), now());
  }

  async function handle(req, res, url, opts) {
    if (opts.privacy || opts.demo || !fs.existsSync(entry)) {
      send(res, 404, { available: false });
      return;
    }
    const refresh = url.pathname === '/api/codex-usage/refresh';
    const status = url.pathname === '/api/codex-usage/status';
    const report = url.pathname === '/api/codex-usage';
    if (!status && !refresh && !report) { send(res, 404, { error: 'not_found' }); return; }
    const method = refresh ? 'POST' : 'GET';
    if (req.method !== method) { send(res, 405, { error: 'method_not_allowed' }); return; }
    const requestOrigin = req.headers.origin;
    const sameOrigin = requestOrigin === `http://${req.headers.host}`;
    if (req.headers['sec-fetch-site'] === 'cross-site' || (requestOrigin && !sameOrigin) ||
        (refresh && (!sameOrigin || req.headers['x-whatsmyagentdoing'] !== 'codex-usage'))) {
      send(res, 403, { error: 'invalid_origin' });
      return;
    }
    if (status) { send(res, 200, { available: true }); return; }
    try {
      await ensureReady();
      const upstream = await read(refresh ? '/api/refresh' : '/api/report', method, 8_000);
      if (refresh && upstream.status === 202) send(res, 202, {});
      else if (report && upstream.status === 200) send(res, 200, usageReport(upstream.data));
      else send(res, 503, { error: 'collector_unavailable' });
    } catch {
      send(res, 503, { error: 'collector_unavailable' });
    }
  }

  return { handle, usageSummary };
}

module.exports = { createCodexUsageBridge };
