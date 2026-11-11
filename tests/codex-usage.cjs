'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { EventEmitter, once } = require('node:events');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createServer } = require('../src/server');
const { createCodexUsageBridge } = require('../src/codex-usage');

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}

function office(opts, bridge, achievementsDataDir) {
  const watcher = new EventEmitter();
  watcher.sessions = () => [];
  return createServer(watcher, opts, { codexUsageBridge: bridge, achievementsDataDir });
}

function json(res, value, code = 200) {
  res.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(value));
}

function dataDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myoffice-usage-achievements-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('native Codex usage routes expose usage only, enforce origin and hide in private or demo', async (t) => {
  const calls = [];
  const row = ['2026-11-10', 9, 'gpt-6.1-sol', 'repo', 100, 75, 25, 15, 0, null, 1];
  const upstream = http.createServer((req, res) => {
    calls.push([req.method, req.url, req.headers.origin]);
    if (req.url === '/api/health') return json(res, { app: 'codex-token-dashboard' });
    if (req.url === '/api/report') return json(res, {
      rows: [row],
      projects: { repo: { name: 'Repo', path: '/fixture/repo', prompt: 'hidden' }, other: { name: 'Unused' } },
      status: { running: false, scanned: 1, prompt: 'hidden' },
      timezone: 'Asia/Shanghai', pricingDate: '2026-11-10', transcript: 'hidden',
    });
    json(res, {}, 202);
  });
  const source = await listen(upstream, t);
  let summaryCalls = 0;
  const bridge = createCodexUsageBridge({
    port: upstream.address().port, entry: __filename, now: () => Date.UTC(2026, 10, 10, 7),
  });
  const readSummary = bridge.usageSummary;
  bridge.usageSummary = () => { summaryCalls += 1; return readSummary(); };
  const url = await listen(office({}, bridge, dataDir(t)), t);
  const base = '/api/codex-usage';
  assert.deepEqual(await (await fetch(url + base + '/status')).json(), { available: true });
  assert.equal(calls.length, 0, 'discovery does not start or probe the collector');
  const report = await fetch(url + base);
  assert.equal(report.status, 200);
  assert.equal(report.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.deepEqual(await report.json(), {
    rows: [row], projects: { repo: { name: 'Repo', path: '/fixture/repo' } },
    status: { running: false, scanned: 1 }, timezone: 'Asia/Shanghai', pricingDate: '2026-11-10',
  });
  const summary = await bridge.usageSummary();
  assert.deepEqual(summary, { tokens: 125, projects: 1 });
  assert.deepEqual(Object.keys(summary).sort(), ['projects', 'tokens']);
  const priorSummaryCalls = summaryCalls;
  const achievements = await (await fetch(url + '/api/achievements')).json();
  assert.deepEqual(achievements.stats, { tokens: 125, projects: 1, sessions: 0, activeDays: 0, streak: 0, agents: 0 });
  assert.equal(summaryCalls, priorSummaryCalls + 1, 'one local view reads one aggregate report');
  const refresh = url + base + '/refresh';
  const header = { 'x-whatsmyagentdoing': 'codex-usage' };
  assert.equal((await fetch(refresh, { method: 'POST', headers: { ...header, origin: 'http://localhost:9' } })).status, 403);
  assert.equal((await fetch(refresh, { method: 'POST', headers: { origin: url } })).status, 403);
  assert.equal((await fetch(url + base, { headers: { origin: 'http://localhost:9' } })).status, 403);
  assert.equal((await fetch(refresh, { method: 'POST', headers: { ...header, origin: url } })).status, 202);
  assert.deepEqual(calls.filter((c) => c[0] === 'POST'), [['POST', '/api/refresh', source]]);
  assert.equal((await fetch(url + base + '/unknown')).status, 404);
  for (const opts of [{ privacy: true }, { demo: true }]) {
    const guarded = await listen(office(opts, bridge), t);
    assert.equal((await fetch(guarded + base + '/status')).status, 404);
    assert.equal((await fetch(guarded + base)).status, 404);
    assert.equal((await fetch(guarded + base + '/refresh', {
      method: 'POST', headers: { ...header, origin: guarded },
    })).status, 404);
    assert.equal((await fetch(guarded + '/api/achievements')).status, 404);
  }
  assert.equal(summaryCalls, 2, 'private and demo achievements do not ask the collector for metrics');
  assert.equal(calls.length, 8, 'only three health/report reads and one health/refresh reach the collector');
});

test('usage summary counts the Shanghai 30-day window and distinct project IDs only', async (t) => {
  const rows = [
    ['2026-10-12', 9, 'model', 'old', 90, 0, 9, 0, 0, null, 1],
    ['2026-10-13', 9, 'model', 'alpha', 10, 3, 5, 0, 0, null, 1],
    ['2026-11-10', 9, 'model', 'alpha', 20, 0, 3, 0, 0, null, 1],
    ['2026-11-11', 0, 'model', 'beta', 4, 1, 6, 0, 0, null, 1],
    ['2026-11-12', 0, 'model', 'future', 100, 0, 100, 0, 0, null, 1],
  ];
  const projects = Object.fromEntries(['old', 'alpha', 'beta', 'future'].map((id) => [id, { name: id, path: `/private/${id}` }]));
  const upstream = http.createServer((req, res) => {
    if (req.url === '/api/health') return json(res, { app: 'codex-token-dashboard' });
    if (req.url === '/api/report') return json(res, {
      rows, projects, status: { running: false }, timezone: 'Asia/Shanghai', pricingDate: '2026-11-11',
    });
    json(res, {}, 404);
  });
  await listen(upstream, t);
  const bridge = createCodexUsageBridge({
    port: upstream.address().port, entry: __filename, now: () => Date.UTC(2026, 10, 10, 16),
  });
  assert.deepEqual(await bridge.usageSummary(), { tokens: 48, projects: 2 });
});

test('an unexpected service on the collector port cannot provide usage or trigger a launch', async (t) => {
  const upstream = http.createServer((req, res) => json(res, { app: 'another-service' }));
  await listen(upstream, t);
  let launches = 0;
  const bridge = createCodexUsageBridge({ port: upstream.address().port, entry: __filename, launch: () => { launches++; } });
  const url = await listen(office({}, bridge), t);
  assert.equal((await fetch(url + '/api/codex-usage')).status, 503);
  assert.equal(launches, 0);
});
