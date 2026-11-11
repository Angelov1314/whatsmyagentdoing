'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { createAchievements } = require('../src/achievements');
const { PUBLISH_EXPIRY_HEADER } = require('../src/achievement-protocol');
const { createHallServer } = require('../hall/server');

const ROUTE = '/api/achievements';
const DAY = 86_400_000;
const instant = Date.UTC(2026, 10, 10, 7);
const row = (id, at, agent = 'codex', extra = {}) => ({
  id, agent, lastEventAt: at, title: 'PRIVATE_FIXTURE_TITLE', cwd: '/PRIVATE_FIXTURE_PROJECT',
  prompt: 'PRIVATE_FIXTURE_PROMPT', reply: 'PRIVATE_FIXTURE_REPLY', ...extra,
});

function dataDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myoffice-achievements-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

async function listen(t, server) {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections?.();
    server.close();
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function local(t, achievement, rows, opts = {}) {
  const watcher = new EventEmitter();
  watcher.sessions = () => rows;
  const server = http.createServer((req, res) => achievement.handle(req, res, new URL(req.url, 'http://localhost'), opts, watcher));
  achievement.attach(watcher, opts, server);
  return listen(t, server);
}

async function request(origin, suffix = '', body, requestOrigin = origin) {
  const init = body === undefined ? {} : {
    method: 'POST',
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json', 'x-whatsmyagentdoing': 'achievements' },
    body: JSON.stringify(body),
  };
  const response = await fetch(origin + ROUTE + suffix, init);
  return { status: response.status, data: await response.json() };
}

test('collects unique local sessions and streaks, persists unlocks, and drops expired progress', async (t) => {
  let now = instant;
  const dir = dataDir(t);
  const samples = [
    row('main-1', instant - 2 * DAY), row('main-1', instant - DAY),
    row('main-2', instant - DAY + 0.5, 'claude'), row('main-2', instant - DAY + 0.5, 'claude'),
    row('main-3', instant), row('main-4', instant), row('main-5', instant),
    row('sub', instant, 'codex', { subagent: true }),
    row('remote', instant, 'gemini', { source: 'magpie' }),
    row('future', instant + DAY), row('old', instant - 30 * DAY),
  ];
  const origin = await local(t, createAchievements({ dataDir: dir, origin: null, now: () => now }), samples);
  const { status, data } = await request(origin);
  assert.equal(status, 200);
  assert.deepEqual(data.summary, { sessions: 5, activeDays: 3, streak: 3, agents: 2 });
  assert.equal(data.score, 120);
  assert.equal(data.connection, 'offline');
  assert.deepEqual(data.badges.filter((badge) => badge.earnedAt).map((badge) => badge.id),
    ['first', 'sessions5', 'active3', 'streak3', 'toolbox']);
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE_FIXTURE|main-1/);
  const saved = fs.readFileSync(path.join(dir, 'achievements-v1.json'), 'utf8');
  assert.doesNotMatch(saved, /PRIVATE_FIXTURE|main-1/);
  now += 31 * DAY;
  const afterRestart = await local(t, createAchievements({ dataDir: dir, origin: null, now: () => now }), []);
  const next = (await request(afterRestart)).data;
  assert.deepEqual(next.summary, { sessions: 0, activeDays: 0, streak: 0, agents: 0 });
  assert.equal(next.score, 120);
});

test('publishes exactly one confirmed preview, survives reload and withdraws with the original service', async (t) => {
  let now = instant;
  const dir = dataDir(t);
  const remote = createHallServer({ dbPath: ':memory:' });
  remote.once('close', () => remote.hallDatabase.close());
  const hall = await listen(t, remote);
  const destination = 'https://vibe-hall.example';
  const writes = [];
  const fetchRemote = (url, init) => {
    assert.equal(new URL(url).origin, destination);
    if (init.method !== 'GET') writes.push({ url, method: init.method, body: init.body });
    return fetch(hall + new URL(url).pathname + new URL(url).search, init);
  };
  const rows = [row('hidden-session', instant)];
  const usageSummary = async () => ({ tokens: 12345, projects: 2 });
  const previewOffice = await local(t, createAchievements({ dataDir: dir, origin: hall, now: () => now, usageSummary }), rows);
  const localPreview = await request(previewOffice, '/preview', { alias: 'Local only' });
  assert.equal((await request(previewOffice, '/publish', { consentId: localPreview.data.consentId, consent: true })).data.error, 'preview_only');
  const origin = await local(t, createAchievements({ dataDir: dir, origin: destination, now: () => now, fetchRemote, usageSummary }), rows);
  assert.equal((await request(origin)).data.connection, 'public');
  assert.equal((await request(origin, '/leaderboard')).data.total, 0);
  const ready = await request(origin, '/preview', { alias: '  林间-阿星  ' });
  assert.equal(ready.status, 200);
  assert.deepEqual(ready.data.profile, {
    alias: '林间-阿星', badges: ['first'], score: 10,
    stats: { tokens: 12345, projects: 2, sessions: 1, activeDays: 1, streak: 1, agents: 1 },
  });
  assert.equal(writes.length, 0);
  assert.equal((await request(origin, '/publish', { consentId: ready.data.consentId, consent: false })).status, 400);
  assert.equal((await request(origin, '/publish', { consentId: ready.data.consentId, consent: true }, 'https://other.example')).status, 403);
  assert.equal((await request(origin, '/preview', { alias: 'Example', cwd: 'hidden' })).status, 400);
  assert.equal(writes.length, 0);
  // The exact preview is frozen even if new achievements arrive before confirmation.
  rows.push(row('another', instant, 'claude'));
  assert.equal((await request(origin)).data.score, 30);
  const publish = await request(origin, '/publish', { consentId: ready.data.consentId, consent: true });
  assert.deepEqual(publish, { status: 200, data: { rank: 1, total: 1 } });
  assert.equal((await request(origin, '/publish', { consentId: ready.data.consentId, consent: true })).status, 409);
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0].body), { consent: true, profile: ready.data.profile });
  const board = (await request(origin, '/leaderboard')).data;
  assert.deepEqual(board.entries, [{ ...ready.data.profile, rank: 1 }]);
  const sessionBoard = (await request(origin, '/leaderboard?metric=sessions')).data;
  assert.deepEqual(sessionBoard.entries, [{ ...ready.data.profile, rank: 1, value: 1 }]);
  assert.equal(sessionBoard.metric, 'sessions');
  const expired = await request(origin, '/preview', { alias: 'Example' });
  now += 11 * 60_000;
  assert.equal((await request(origin, '/publish', { consentId: expired.data.consentId, consent: true })).data.error, 'expired_preview');
  const restarted = await local(t, createAchievements({ dataDir: dir, origin: null, now: () => now, fetchRemote }), rows);
  const after = (await request(restarted)).data;
  assert.equal(after.connection, 'offline');
  assert.deepEqual(after.publication, { alias: '林间-阿星', status: 'published' });
  assert.equal((await request(restarted, '/withdraw', {})).data.removed, true);
  assert.equal((await request(origin, '/leaderboard')).data.total, 0);
  assert.deepEqual(writes.map(({ method }) => method), ['PUT', 'DELETE']);
});

test('hall migrates legacy entries and ranks only validated, available metrics', async (t) => {
  const dir = dataDir(t);
  const dbPath = path.join(dir, 'hall.sqlite');
  const legacyToken = 'a'.repeat(64);
  const legacyHash = createHash('sha256').update(legacyToken).digest('hex');
  const legacy = new DatabaseSync(dbPath);
  legacy.exec(`CREATE TABLE entries (
    token_hash TEXT PRIMARY KEY NOT NULL,
    alias TEXT NOT NULL,
    badges_json TEXT NOT NULL CHECK (json_valid(badges_json)),
    score INTEGER NOT NULL CHECK (score >= 0),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`);
  legacy.prepare('INSERT INTO entries VALUES (?, ?, ?, ?, ?, ?)').run(legacyHash, 'Legacy Maker', '["first"]', 10, 1, 1);
  legacy.close();

  const server = createHallServer({ dbPath, pageSize: 10 });
  server.once('close', () => server.hallDatabase.close());
  const hall = await listen(t, server);
  const profiles = [
    ['b'.repeat(64), 'Alpha Maker', { tokens: 200, projects: 4, sessions: 3, activeDays: 2, streak: 1, agents: 1 }],
    ['c'.repeat(64), 'Beta Maker', { tokens: 300, projects: 2, sessions: 10, activeDays: 4, streak: 4, agents: 3 }],
    ['d'.repeat(64), 'No Token Data', { tokens: null, projects: 0, sessions: 0, activeDays: 1, streak: 0, agents: 0 }],
  ];
  for (const [token, alias, stats] of profiles) {
    const response = await fetch(hall + '/api/v1/entry', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
        [PUBLISH_EXPIRY_HEADER]: String(Date.now() + 60_000),
      },
      body: JSON.stringify({ consent: true, profile: { alias, badges: ['first'], score: 10, stats } }),
    });
    assert.equal(response.status, 200);
  }
  const oldClient = await fetch(hall + '/api/v1/entry', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${'e'.repeat(64)}`, 'Content-Type': 'application/json',
      [PUBLISH_EXPIRY_HEADER]: String(Date.now() + 60_000),
    },
    body: JSON.stringify({ consent: true, profile: { alias: 'Old Client', badges: ['first'], score: 10 } }),
  });
  assert.equal(oldClient.status, 200, 'legacy profiles remain accepted');

  const defaultBoard = await (await fetch(hall + '/api/v1/leaderboard')).json();
  assert.equal(defaultBoard.total, 5);
  assert.equal(defaultBoard.entries.find((entry) => entry.alias === 'Legacy Maker').stats, undefined);
  assert.equal(defaultBoard.entries.find((entry) => entry.alias === 'Old Client').stats, undefined);
  assert.equal(defaultBoard.entries.find((entry) => entry.alias === 'Alpha Maker').stats.tokens, 200);

  for (const [metric, alias, value, total] of [
    ['tokens', 'Beta Maker', 300, 2], ['projects', 'Alpha Maker', 4, 3],
    ['sessions', 'Beta Maker', 10, 3], ['activeDays', 'Beta Maker', 4, 3],
    ['streak', 'Beta Maker', 4, 3], ['agents', 'Beta Maker', 3, 3],
  ]) {
    const result = await (await fetch(`${hall}/api/v1/leaderboard?metric=${metric}&page=1`)).json();
    assert.equal(result.metric, metric);
    assert.equal(result.total, total);
    assert.equal(result.entries[0].alias, alias);
    assert.equal(result.entries[0].value, value);
    assert.equal(result.entries[0].stats[metric], value);
    assert.equal(result.entries[0].rank, 1);
  }
  assert.equal((await fetch(hall + '/api/v1/leaderboard?metric=unknown')).status, 400);
  assert.equal((await fetch(hall + '/api/v1/leaderboard?metric=tokens&metric=projects')).status, 400);
  const invalid = await fetch(hall + '/api/v1/entry', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${'f'.repeat(64)}`, 'Content-Type': 'application/json',
      [PUBLISH_EXPIRY_HEADER]: String(Date.now() + 60_000),
    },
    body: JSON.stringify({ consent: true, profile: {
      alias: 'Invalid Stats', badges: ['first'], score: 10,
      stats: { tokens: -1, projects: 0, sessions: 0, activeDays: 0, streak: 0, agents: 0 },
    } }),
  });
  assert.equal(invalid.status, 400);
});

test('withdrawal blocks a publish request delayed past the local timeout', async (t) => {
  const dir = dataDir(t);
  const remote = createHallServer({ dbPath: ':memory:' });
  remote.once('close', () => remote.hallDatabase.close());
  const hall = await listen(t, remote);
  let delayed;
  const origin = await local(t, createAchievements({
    dataDir: dir, origin: 'https://vibe-hall.example', now: () => instant,
    fetchRemote(url, init) {
      const endpoint = hall + new URL(url).pathname;
      if (init.method === 'PUT') {
        delayed = () => fetch(endpoint, init);
        throw new Error('buffered by proxy');
      }
      return fetch(endpoint, init);
    },
  }), [row('delayed', instant)]);
  const ready = (await request(origin, '/preview', { alias: 'Delayed Test' })).data;
  assert.equal((await request(origin, '/publish', { consentId: ready.consentId, consent: true })).status, 503);
  assert.equal((await request(origin)).data.publication.status, 'pending');
  assert.deepEqual(await request(origin, '/withdraw', {}), { status: 200, data: { removed: true } });
  assert.equal((await request(origin)).data.publication, null);
  assert.equal((await delayed()).status, 409);
  assert.equal((await (await fetch(hall + '/api/v1/leaderboard')).json()).total, 0);
});

test('private and demo mode leave storage and public service untouched', async (t) => {
  const dir = dataDir(t);
  const failFetch = () => assert.fail('no external request in private or demo mode');
  for (const opts of [{ demo: true }, { privacy: true }]) {
    const origin = await local(t, createAchievements({ dataDir: dir, origin: 'https://hall.example', now: () => instant, fetchRemote: failFetch }), [row('private', instant)], opts);
    for (const [suffix, body] of [[''], ['/leaderboard'], ['/preview', { alias: 'Example' }], ['/publish', { consent: true }], ['/withdraw', {}]]) {
      assert.deepEqual(await request(origin, suffix, body), { status: 404, data: { available: false } });
    }
  }
  assert.deepEqual(fs.readdirSync(dir), []);
});
