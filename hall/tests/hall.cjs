'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { createHallServer } = require('../server');

function profile(alias, badges, score) {
  return { alias, badges, score };
}

async function withServer(fn, options = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-hall-test-'));
  const server = createHallServer({ dbPath: path.join(temp, 'hall.sqlite'), ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    await fn(base, server);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    server.hallDatabase.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function token() {
  return crypto.randomBytes(32).toString('hex');
}

async function put(base, bearer, body, extraHeaders = {}) {
  return fetch(`${base}/api/v1/entry`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', 'x-myoffice-publish-until': String(Date.now() + 60_000), ...extraHeaders },
    body: JSON.stringify(body),
  });
}

test('health and empty public page work without an account', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    const response = await fetch(`${base}/api/v1/leaderboard`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { entries: [], page: 1, pages: 1, total: 0 });

    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /自我申报/);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  });
});

test('only explicit, exact public profile data is accepted and upserted', async () => {
  await withServer(async (base) => {
    const bearer = token();
    assert.equal((await put(base, bearer, { consent: false, profile: profile('Maker One', ['first'], 10) })).status, 400);
    assert.equal((await put(base, bearer, { consent: true, profile: profile('Maker One', ['first'], 999) })).status, 400);
    assert.equal((await put(base, bearer, { consent: true, profile: profile('Maker One', ['first'], 10), email: 'private@example.test' })).status, 400);
    assert.equal((await put(base, bearer, { consent: true, profile: { alias: 'Maker One', badges: ['first'], score: 10, sessions: 500 } })).status, 400);

    const expired = await put(base, bearer, { consent: true, profile: profile('Maker One', ['first'], 10) }, {
      'x-myoffice-publish-until': String(Date.now() - 1_000),
    });
    assert.equal(expired.status, 400);
    const first = await put(base, bearer, { consent: true, profile: profile('Maker One', ['first'], 10) });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { rank: 1, total: 1 });
    const updated = await put(base, bearer, { consent: true, profile: profile('Maker One', ['first', 'sessions5'], 30) });
    assert.equal(updated.status, 200);
    assert.deepEqual(await updated.json(), { rank: 1, total: 1 });

    const own = await fetch(`${base}/api/v1/entry`, { headers: { Authorization: `Bearer ${bearer}` } });
    assert.deepEqual(await own.json(), { rank: 1, total: 1 });
  });
});

test('bearer credentials are required, origins are rejected, and withdrawal is idempotent', async () => {
  await withServer(async (base) => {
    const bearer = token();
    assert.equal((await fetch(`${base}/api/v1/entry`, { method: 'DELETE' })).status, 401);
    assert.equal((await put(base, 'A'.repeat(64), { consent: true, profile: profile('Maker One', ['first'], 10) })).status, 401);
    assert.equal((await put(base, bearer, { consent: true, profile: profile('Maker One', ['first'], 10) }, { Origin: 'https://attacker.example' })).status, 403);
    await put(base, bearer, { consent: true, profile: profile('Maker One', ['first'], 10) });
    const ignoredBodyRejected = await fetch(`${base}/api/v1/entry`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'private@example.test' }),
    });
    assert.equal(ignoredBodyRejected.status, 400);
    assert.equal((await fetch(`${base}/api/v1/entry`, { headers: { Authorization: `Bearer ${bearer}` } })).status, 200);
    const first = await fetch(`${base}/api/v1/entry`, { method: 'DELETE', headers: { Authorization: `Bearer ${bearer}` } });
    const second = await fetch(`${base}/api/v1/entry`, { method: 'DELETE', headers: { Authorization: `Bearer ${bearer}` } });
    assert.deepEqual(await first.json(), { removed: true });
    assert.deepEqual(await second.json(), { removed: true });
    assert.equal((await fetch(`${base}/api/v1/entry`, { headers: { Authorization: `Bearer ${bearer}` } })).status, 404);
  });
});

test('leaderboard ranks, orders, paginates, and safely serves aliases as text', async () => {
  await withServer(async (base, serverUnderTest) => {
    const a = token();
    const b = token();
    const c = token();
    const rejectedAlias = await put(base, a, { consent: true, profile: profile('<script>alert(1)</script>', ['first'], 10) });
    assert.equal(rejectedAlias.status, 400);
    await put(base, b, { consent: true, profile: profile('Maker Two', ['first', 'sessions5'], 30) });
    await put(base, c, { consent: true, profile: profile('Maker Three', ['first'], 10) });

    // Simulate a legacy/corrupt stored alias to ensure the browser still renders it as text.
    const injectedHash = crypto.createHash('sha256').update(a).digest('hex');
    // Simulate a legacy/corrupt stored alias to ensure the browser still renders it as text.
    serverUnderTest.hallDatabase.prepare(`
      INSERT INTO entries(token_hash, alias, badges_json, score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(injectedHash, '<script>alert(1)</script>', '["first"]', 10, 0, 0);

    const response = await fetch(`${base}/api/v1/leaderboard?page=1`);
    const board = await response.json();
    assert.equal(board.total, 3);
    assert.deepEqual(board.entries.map((entry) => entry.rank), [1, 2]);
    assert.deepEqual(board.entries.map((entry) => entry.alias), ['Maker Two', '<script>alert(1)</script>']);
    assert.deepEqual(board.entries.map((entry) => entry.badges), [['first', 'sessions5'], ['first']]);
    const secondPage = await fetch(`${base}/api/v1/leaderboard?page=2`);
    assert.deepEqual((await secondPage.json()).entries.map((entry) => entry.alias), ['Maker Three']);

    const page = await fetch(base);
    const html = await page.text();
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    const script = await fetch(`${base}/hall.js`);
    assert.match(await script.text(), /name\.textContent = entry\.alias/);
  }, { pageSize: 2 });
});

test('body limits, media type, method, and page inputs are bounded', async () => {
  await withServer(async (base) => {
    const bearer = token();
    assert.equal((await fetch(`${base}/api/v1/leaderboard?page=0`)).status, 400);
    assert.equal((await fetch(`${base}/api/v1/leaderboard?page=1&token=secret`)).status, 400);
    assert.equal((await fetch(`${base}/api/v1/leaderboard`, { method: 'POST' })).status, 405);
    const wrongType = await fetch(`${base}/api/v1/entry`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'text/plain' },
      body: '{}',
    });
    assert.equal(wrongType.status, 415);
    const tooLarge = await fetch(`${base}/api/v1/entry`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, profile: { alias: 'A'.repeat(9000) } }),
    });
    assert.equal(tooLarge.status, 413);
  });
});

test('entry capacity rejects new rows but permits existing owners to update', async () => {
  await withServer(async (base) => {
    const a = token();
    const b = token();
    const accepted = await put(base, a, { consent: true, profile: profile('Maker One', ['first'], 10) });
    assert.equal(accepted.status, 200);
    const full = await put(base, b, { consent: true, profile: profile('Maker Two', ['first'], 10) });
    assert.equal(full.status, 503);
    const update = await put(base, a, { consent: true, profile: profile('Maker One', ['first', 'sessions5'], 30) });
    assert.equal(update.status, 200);
  }, { maxEntries: 1 });
});

test('expired withdrawal keys do not count against the active cap', async () => {
  await withServer(async (base, server) => {
    server.hallDatabase.exec(`
      WITH RECURSIVE sample(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM sample WHERE n < 50000)
      INSERT INTO revoked_keys(token_hash, expires_at)
      SELECT printf('%064x', n), 0 FROM sample;
    `);
    const response = await put(base, token(), { consent: true, profile: profile('New Maker', ['first'], 10) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { rank: 1, total: 1 });
  });
});
