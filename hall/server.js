'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { parseProfile, parseStats, RANK_METRICS, PUBLISH_WINDOW_MS, PUBLISH_EXPIRY_HEADER } = require('../src/achievement-protocol');

const BODY_LIMIT = 8 * 1024;
const MAX_REVOCATIONS = 50_000;
const BADGE_IDS = new Set(['first', 'sessions5', 'active3', 'streak3', 'toolbox', 'sessions25', 'active10', 'streak7']);
const STATIC_DIR = path.join(__dirname, 'public');

function json(res, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function fail(res, status, code) {
  json(res, status, { error: code });
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('body too large'), { status: 413, code: 'body_too_large' }));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('invalid json'), { status: 400, code: 'invalid_json' }));
      }
    });
    req.on('error', () => reject(Object.assign(new Error('request failed'), { status: 400, code: 'invalid_request' })));
  });
}

function exactObjectKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function getAuthToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || header.length > 80) return null;
  const match = /^Bearer ([0-9a-f]{64})$/.exec(header);
  return match ? match[1] : null;
}

function contentTypeIsJson(req) {
  const value = req.headers['content-type'];
  return typeof value === 'string' && /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(value.trim());
}

function hasRequestBody(req) {
  return (req.headers['content-length'] !== undefined && req.headers['content-length'] !== '0') ||
    req.headers['transfer-encoding'] !== undefined;
}

function requestUrl(req) {
  try {
    return new URL(req.url, 'http://localhost');
  } catch {
    return null;
  }
}

function publicEntry(row) {
  let badges;
  try {
    badges = JSON.parse(row.badges_json);
  } catch {
    badges = [];
  }
  const entry = {
    alias: row.alias,
    badges: Array.isArray(badges) ? badges.filter((badge) => BADGE_IDS.has(badge)) : [],
    score: row.score,
    rank: row.rank,
  };
  if (typeof row.stats_json === 'string') {
    try {
      const stats = parseStats(JSON.parse(row.stats_json));
      if (stats) entry.stats = stats;
    } catch { /* Keep legacy public entries readable if optional metadata is damaged. */ }
  }
  if (row.value !== undefined) entry.value = row.value;
  return entry;
}

function createHallServer({ dbPath, maxEntries = 10000, pageSize = 25 } = {}) {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new TypeError('maxEntries must be a positive safe integer');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new TypeError('pageSize must be between 1 and 100');
  const selectedDbPath = dbPath || process.env.DB_PATH || path.join(__dirname, 'data', 'hall.sqlite');
  if (selectedDbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(selectedDbPath)), { recursive: true, mode: 0o700 });

  const db = new DatabaseSync(selectedDbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS entries (
      token_hash TEXT PRIMARY KEY NOT NULL,
      alias TEXT NOT NULL,
      badges_json TEXT NOT NULL CHECK (json_valid(badges_json)),
      score INTEGER NOT NULL CHECK (score >= 0),
      stats_json TEXT CHECK (stats_json IS NULL OR json_valid(stats_json)),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS entries_score_idx ON entries(score DESC, created_at ASC, token_hash ASC);
    CREATE TABLE IF NOT EXISTS revoked_keys (
      token_hash TEXT PRIMARY KEY NOT NULL,
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS revoked_expiry_idx ON revoked_keys(expires_at);
  `);

  if (!db.prepare('PRAGMA table_info(entries)').all().some((column) => column.name === 'stats_json')) {
    db.exec('ALTER TABLE entries ADD COLUMN stats_json TEXT CHECK (stats_json IS NULL OR json_valid(stats_json))');
  }

  const countRows = db.prepare('SELECT COUNT(*) AS total FROM entries');
  const findByToken = db.prepare('SELECT token_hash FROM entries WHERE token_hash = ?');
  const upsert = db.prepare(`
    INSERT INTO entries(token_hash, alias, badges_json, score, stats_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(token_hash) DO UPDATE SET
      alias = excluded.alias,
      badges_json = excluded.badges_json,
      score = excluded.score,
      stats_json = excluded.stats_json,
      updated_at = excluded.updated_at
  `);
  const byRank = db.prepare(`
    WITH ranked AS (
      SELECT token_hash, RANK() OVER (ORDER BY score DESC) AS rank
      FROM entries
    )
    SELECT rank FROM ranked WHERE token_hash = ?
  `);
  const pageRows = db.prepare(`
    WITH ranked AS (
      SELECT alias, badges_json, score, stats_json, RANK() OVER (ORDER BY score DESC) AS rank,
             created_at, token_hash
      FROM entries
    )
    SELECT alias, badges_json, score, stats_json, rank
    FROM ranked
    ORDER BY score DESC, created_at ASC, token_hash ASC
    LIMIT ? OFFSET ?
  `);
  const metricCount = db.prepare("SELECT COUNT(*) AS total FROM entries WHERE json_type(stats_json, ?) = 'integer'");
  const metricRank = db.prepare(`
    WITH ranked AS (
      SELECT token_hash, RANK() OVER (ORDER BY CAST(json_extract(stats_json, ?) AS INTEGER) DESC) AS rank
      FROM entries
      WHERE json_type(stats_json, ?) = 'integer'
    )
    SELECT rank FROM ranked WHERE token_hash = ?
  `);
  const metricPageRows = db.prepare(`
    WITH ranked AS (
      SELECT alias, badges_json, score, stats_json,
             CAST(json_extract(stats_json, ?) AS INTEGER) AS value,
             RANK() OVER (ORDER BY CAST(json_extract(stats_json, ?) AS INTEGER) DESC) AS rank,
             created_at, token_hash
      FROM entries
      WHERE json_type(stats_json, ?) = 'integer'
    )
    SELECT alias, badges_json, score, stats_json, value, rank
    FROM ranked
    ORDER BY value DESC, created_at ASC, token_hash ASC
    LIMIT ? OFFSET ?
  `);
  const deleteByToken = db.prepare('DELETE FROM entries WHERE token_hash = ?');
  const expiredKeys = db.prepare('DELETE FROM revoked_keys WHERE expires_at <= ?');
  const revokedCount = db.prepare('SELECT COUNT(*) AS total FROM revoked_keys WHERE expires_at > ?');
  const isRevoked = db.prepare('SELECT 1 FROM revoked_keys WHERE token_hash = ? AND expires_at > ?');
  const revoke = db.prepare('INSERT OR IGNORE INTO revoked_keys(token_hash, expires_at) VALUES (?, ?)');

  function totalCount(metric = null) {
    return metric ? metricCount.get(`$.${metric}`).total : countRows.get().total;
  }

  function rankFor(tokenHash, metric = null) {
    return metric ? metricRank.get(`$.${metric}`, `$.${metric}`, tokenHash) : byRank.get(tokenHash);
  }

  function pageRowsFor(page, metric = null) {
    return metric
      ? metricPageRows.all(`$.${metric}`, `$.${metric}`, `$.${metric}`, pageSize, (page - 1) * pageSize)
      : pageRows.all(pageSize, (page - 1) * pageSize);
  }

  async function handle(req, res) {
    setSecurityHeaders(res);
    const url = requestUrl(req);
    if (!url) return fail(res, 400, 'invalid_request');

    if (req.method === 'GET' && url.pathname === '/healthz') {
      if (url.search) return fail(res, 400, 'invalid_query');
      if (hasRequestBody(req)) return fail(res, 400, 'unexpected_body');
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/v1/leaderboard') {
      if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed');
      if (hasRequestBody(req)) return fail(res, 400, 'unexpected_body');
      if ([...url.searchParams.keys()].some((key) => key !== 'page' && key !== 'metric') ||
          url.searchParams.getAll('page').length > 1 || url.searchParams.getAll('metric').length > 1) {
        return fail(res, 400, 'invalid_query');
      }
      const metric = url.searchParams.get('metric');
      if (metric !== null && !RANK_METRICS.includes(metric)) return fail(res, 400, 'invalid_metric');
      const rawPage = url.searchParams.get('page') || '1';
      if (!/^[1-9]\d{0,8}$/.test(rawPage)) return fail(res, 400, 'invalid_page');
      const page = Number(rawPage);
      if (!Number.isSafeInteger(page)) return fail(res, 400, 'invalid_page');
      const total = totalCount(metric);
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const rows = pageRowsFor(page, metric);
      return json(res, 200, { entries: rows.map(publicEntry), page, pages, total, ...(metric ? { metric } : {}) });
    }

    if (url.pathname === '/api/v1/entry') {
      if (url.search) return fail(res, 400, 'invalid_query');
      if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
        return fail(res, 405, 'method_not_allowed');
      }
      const token = getAuthToken(req);
      if (!token) return fail(res, 401, 'unauthorized');
      const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');

      if (req.method === 'GET') {
        if (hasRequestBody(req)) return fail(res, 400, 'unexpected_body');
        const row = rankFor(tokenHash);
        if (!row) return fail(res, 404, 'not_found');
        return json(res, 200, { rank: row.rank, total: totalCount() });
      }

      if (req.headers.origin || req.headers['sec-fetch-site'] === 'cross-site') {
        return fail(res, 403, 'browser_origin_not_allowed');
      }

      if (req.method === 'DELETE') {
        if (hasRequestBody(req)) return fail(res, 400, 'unexpected_body');
        const now = Date.now();
        db.exec('BEGIN IMMEDIATE');
        try {
          expiredKeys.run(now);
          if (!isRevoked.get(tokenHash, now) && !findByToken.get(tokenHash) && revokedCount.get(now).total >= MAX_REVOCATIONS) {
            db.exec('ROLLBACK');
            return fail(res, 503, 'withdrawal_busy');
          }
          revoke.run(tokenHash, now + PUBLISH_WINDOW_MS);
          deleteByToken.run(tokenHash);
          db.exec('COMMIT');
        } catch {
          db.exec('ROLLBACK');
          return fail(res, 500, 'storage_error');
        }
        return json(res, 200, { removed: true });
      }

      if (!contentTypeIsJson(req)) return fail(res, 415, 'content_type_must_be_json');
      let body;
      try {
        body = await readJson(req);
      } catch (error) {
        return fail(res, error.status || 400, error.code || 'invalid_request');
      }
      if (!exactObjectKeys(body, ['consent', 'profile']) || body.consent !== true) {
        return fail(res, 400, 'explicit_consent_required');
      }
      const profile = parseProfile(body.profile);
      if (!profile) return fail(res, 400, 'invalid_profile');

      const expiresAt = Number(req.headers[PUBLISH_EXPIRY_HEADER]);
      if (!Number.isSafeInteger(expiresAt)) return fail(res, 400, 'invalid_publish_expiry');
      db.exec('BEGIN IMMEDIATE');
      try {
        const now = Date.now();
        if (expiresAt <= now || expiresAt > now + PUBLISH_WINDOW_MS) {
          db.exec('ROLLBACK');
          return fail(res, 400, 'invalid_publish_expiry');
        }
        if (isRevoked.get(tokenHash, now)) {
          db.exec('ROLLBACK');
          return fail(res, 409, 'publication_revoked');
        }
        const exists = findByToken.get(tokenHash);
        if (!exists && (totalCount() >= maxEntries || revokedCount.get(now).total >= MAX_REVOCATIONS)) {
          db.exec('ROLLBACK');
          return fail(res, 503, 'leaderboard_at_capacity');
        }
        upsert.run(tokenHash, profile.alias, JSON.stringify(profile.badges), profile.score,
          profile.stats ? JSON.stringify(profile.stats) : null, now, now);
        db.exec('COMMIT');
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch {}
        return fail(res, 500, 'storage_error');
      }
      const rank = rankFor(tokenHash);
      return json(res, 200, { rank: rank.rank, total: totalCount() });
    }

    if (url.pathname.startsWith('/api/')) return fail(res, 404, 'not_found');
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'method_not_allowed');

    const staticFiles = {
      '/': ['index.html', 'text/html; charset=utf-8'],
      '/index.html': ['index.html', 'text/html; charset=utf-8'],
      '/hall.css': ['hall.css', 'text/css; charset=utf-8'],
      '/hall.js': ['hall.js', 'text/javascript; charset=utf-8'],
    };
    const staticFile = staticFiles[url.pathname];
    if (!staticFile) return fail(res, 404, 'not_found');
    let data;
    try {
      data = fs.readFileSync(path.join(STATIC_DIR, staticFile[0]));
    } catch {
      return fail(res, 500, 'page_unavailable');
    }
    res.writeHead(200, {
      'Content-Type': staticFile[1],
      'Content-Length': data.length,
      'Cache-Control': 'no-cache',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    return res.end(req.method === 'HEAD' ? undefined : data);
  }

  const server = http.createServer((req, res) => {
    Promise.resolve(handle(req, res)).catch(() => {
      if (!res.headersSent) fail(res, 500, 'internal_error');
      else res.destroy();
    });
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 7000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 40;
  server.maxConnections = 200;
  const cleanup = setInterval(() => {
    try { expiredKeys.run(Date.now()); } catch { /* Retry on the next cleanup interval. */ }
  }, 60_000);
  cleanup.unref();
  server.once('close', () => clearInterval(cleanup));
  server.hallDatabase = db;
  server.hallDatabasePath = selectedDbPath;
  return server;
}

if (require.main === module) {
  const server = createHallServer({});
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  server.listen(port, host, () => {
    process.stdout.write(`Vibe Hall listening on ${host}:${port}\n`);
  });
  const shutdown = () => server.close(() => {
    server.hallDatabase.close();
    process.exit(0);
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createHallServer };
