'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { homedir } = require('node:os');
const { createHash, randomBytes } = require('node:crypto');
const { BADGES, RANK_METRICS, parseAlias, parseProfile, PUBLISH_EXPIRY_HEADER } = require('./achievement-protocol');

const DAY = 864e5;
const WINDOW = 30;
const MAX_SESSIONS = 10000;
const AGENTS = new Set(['claude', 'codex', 'gemini', 'antigravity', 'copilot', 'omp', 'pi', 'kimi', 'dsh', 'grok', 'opencode', 'hermes']);
const ROUTE = '/api/achievements';
const EMPTY_STATE = () => ({ version: 1, days: [], sessions: {}, earned: {}, publication: null });
const day = (time) => Math.floor(time / DAY);
const keyFor = (session) => createHash('sha256').update(`${session.agent}:\0${session.id}`).digest('hex');
const error = (status, code) => Object.assign(new Error(code), { status, code });

function hallOrigin(value) {
  try {
    const url = new URL(value);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return { origin: url.origin, kind: loopback ? 'preview' : 'public' };
  } catch {
    return null;
  }
}

function measure(state, time) {
  const today = day(time);
  const cutoff = today - WINDOW + 1;
  const validDays = state.days.filter((value) => value >= cutoff && value <= today).sort((a, b) => a - b);
  let longest = 0;
  let streak = 0;
  let previous = -Infinity;
  for (const value of validDays) {
    streak = value === previous + 1 ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = value;
  }
  const sessions = Object.values(state.sessions).filter(([value]) => value >= cutoff && value <= today);
  return { sessions: sessions.length, activeDays: validDays.length, streak: longest, agents: new Set(sessions.map(([, agent]) => agent)).size };
}

function updateProgress(state, source, time) {
  const today = day(time);
  const cutoff = today - WINDOW + 1;
  const days = new Set(state.days.filter((value) => value >= cutoff && value <= today));
  const sessions = Object.fromEntries(Object.entries(state.sessions).filter(([, [value]]) => value >= cutoff && value <= today));
  const sourceSessions = Array.isArray(source) ? source : [];
  for (const session of sourceSessions) {
    if (!session || session.subagent || session.source === 'magpie' || !AGENTS.has(session.agent) ||
        typeof session.id !== 'string' || !session.id || session.id.length > 512 ||
        !Number.isFinite(session.lastEventAt) || session.lastEventAt > time) continue;
    const value = day(session.lastEventAt);
    if (value < cutoff) continue;
    days.add(value);
    const key = keyFor(session);
    if (sessions[key] && sessions[key][0] >= value) continue;
    sessions[key] = [value, session.agent];
  }
  const trimmed = Object.keys(sessions).length > MAX_SESSIONS
    ? Object.fromEntries(Object.entries(sessions).sort((a, b) => b[1][0] - a[1][0]).slice(0, MAX_SESSIONS))
    : sessions;
  const next = { ...state, days: [...days].sort((a, b) => a - b), sessions: trimmed, earned: { ...state.earned } };
  const summary = measure(next, time);
  for (const badge of BADGES) {
    if (!next.earned[badge.id] && summary[badge.metric] >= badge.target) next.earned[badge.id] = new Date(time).toISOString().slice(0, 10);
  }
  return next;
}

function createStorage(dataDir) {
  const file = path.join(dataDir, 'achievements-v1.json');

  function read() {
    try {
      if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('state_too_large');
      const state = JSON.parse(fs.readFileSync(file, 'utf8'));
      const p = state?.publication;
      if (state?.version !== 1 || !Array.isArray(state.days) || !state.days.every(Number.isSafeInteger) ||
          !state.sessions || typeof state.sessions !== 'object' || Array.isArray(state.sessions) ||
          !Object.entries(state.sessions).every(([key, row]) => /^[0-9a-f]{64}$/.test(key) &&
            Array.isArray(row) && row.length === 2 && Number.isSafeInteger(row[0]) && AGENTS.has(row[1])) ||
          !state.earned || typeof state.earned !== 'object' || Array.isArray(state.earned) ||
          (p !== null && (!p || hallOrigin(p.origin)?.origin !== p.origin || typeof p.key !== 'string' ||
            !/^[0-9a-f]{64}$/.test(p.key) || parseAlias(p.alias) !== p.alias || !['pending', 'published'].includes(p.status)))) {
        throw new Error('invalid_state');
      }
      return state;
    } catch (cause) {
      if (cause?.code === 'ENOENT') return EMPTY_STATE();
      throw error(503, 'storage_unavailable');
    }
  }

  function lock(name) {
    const target = path.join(dataDir, `achievements-${name}.lock`);
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    let fd;
    try {
      fd = fs.openSync(target, 'wx', 0o600);
    } catch (cause) {
      if (cause?.code !== 'EEXIST') throw cause;
      let abandoned = false;
      try {
        if (Date.now() - fs.statSync(target).mtimeMs > 30_000) {
          const pid = Number(fs.readFileSync(target, 'utf8'));
          if (Number.isSafeInteger(pid) && pid > 0) {
            try { process.kill(pid, 0); } catch (probe) { abandoned = probe.code === 'ESRCH'; }
          }
        }
      } catch { /* Retry on the next request if the owner released it. */ }
      if (!abandoned) throw error(409, 'write_in_progress');
      try {
        fs.unlinkSync(target);
        fd = fs.openSync(target, 'wx', 0o600);
      } catch { throw error(409, 'write_in_progress'); }
    }
    try { fs.writeFileSync(fd, String(process.pid)); }
    catch (cause) { try { fs.unlinkSync(target); } catch {} throw cause; }
    finally { fs.closeSync(fd); }
    return () => { try { fs.unlinkSync(target); } catch {} };
  }

  function update(fn) {
    const release = lock('state');
    try {
      const current = read();
      const next = fn(current);
      const json = JSON.stringify(next);
      if (json !== JSON.stringify(current)) {
        const temp = `${file}.${randomBytes(8).toString('hex')}.tmp`;
        try {
          fs.writeFileSync(temp, json + '\n', { flag: 'wx', mode: 0o600 });
          fs.renameSync(temp, file);
        } finally {
          try { fs.unlinkSync(temp); } catch {}
        }
      }
      return next;
    } finally { release(); }
  }
  return { read, update, lock };
}

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'same-origin',
  }).end(JSON.stringify(body));
}

async function limitedJSON(stream, max, status, code) {
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > max) throw error(status, code);
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
  } catch { throw error(status, code); }
}

function hasOnly(data, names) {
  return data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === names.length &&
    names.every((name) => Object.hasOwn(data, name));
}

function configuredOrigin(dataDir) {
  if (process.env.MYOFFICE_HALL_URL !== undefined) return process.env.MYOFFICE_HALL_URL;
  const file = path.join(dataDir, 'hall-config.json');
  try {
    if (fs.statSync(file).size > 2048) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'))?.origin;
  } catch { return null; }
}

function createAchievements({ dataDir = path.join(homedir(), '.whatsmyagentdoing'), origin, now = Date.now, fetchRemote = globalThis.fetch,
  usageSummary = async () => null } = {}) {
  const target = hallOrigin(origin === undefined ? configuredOrigin(dataDir) : origin);
  const storage = createStorage(dataDir);
  const previews = new Map();
  let lastCollect = -Infinity;

  function collect(watcher, force = false) {
    const time = now();
    if (!force && time - lastCollect < 3000) return;
    lastCollect = time;
    const sessions = watcher.sessions();
    const current = storage.read();
    const next = updateProgress(current, sessions, time);
    if (JSON.stringify(next) !== JSON.stringify(current)) storage.update((latest) => updateProgress(latest, sessions, time));
  }

  function attach(watcher, opts, server) {
    if (opts.privacy || opts.demo) return;
    const capture = () => { try { collect(watcher); } catch { /* Collect on the next local observation. */ } };
    watcher.on('change', capture);
    const timer = setInterval(capture, 20_000);
    timer.unref();
    server.once('close', () => {
      clearInterval(timer);
      watcher.off?.('change', capture);
    });
    capture();
  }

  async function usageStats() {
    try {
      const value = await usageSummary();
      return {
        tokens: Number.isSafeInteger(value?.tokens) && value.tokens >= 0 ? value.tokens : null,
        projects: Number.isSafeInteger(value?.projects) && value.projects >= 0 ? value.projects : null,
      };
    } catch {
      return { tokens: null, projects: null };
    }
  }

  async function localView() {
    const state = storage.read();
    const summary = measure(state, now());
    const stats = { ...(await usageStats()), ...summary };
    const badges = BADGES.map((badge) => ({
      ...badge, progress: Math.min(badge.target, summary[badge.metric]), earnedAt: state.earned[badge.id] || null,
    }));
    return {
      available: true, summary, stats, badges, score: badges.filter((badge) => badge.earnedAt).reduce((total, badge) => total + badge.points, 0),
      connection: target?.kind || 'offline', destination: target?.origin || null,
      publication: state.publication ? { alias: state.publication.alias, status: state.publication.status } : null,
    };
  }

  async function remote(host, resource, method = 'GET', key = null, body) {
    try {
      const response = await fetchRemote(host + resource, {
        method, redirect: 'error', signal: AbortSignal.timeout(5500),
        headers: { Accept: 'application/json', ...(key && { Authorization: `Bearer ${key}` }),
          ...(body && { 'Content-Type': 'application/json' }),
          ...(method === 'PUT' && { [PUBLISH_EXPIRY_HEADER]: String(Date.now() + 60_000) }) },
        body: body && JSON.stringify(body),
      });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('application/json') ||
          Number(response.headers.get('content-length')) > 48 * 1024) {
        await response.body?.cancel();
        throw error(503, 'hall_unavailable');
      }
      return await limitedJSON(response.body, 48 * 1024, 503, 'hall_unavailable');
    } catch { throw error(503, 'hall_unavailable'); }
  }

  async function leaderboard(page, metric) {
    if (!target) throw error(503, 'no_connection');
    const query = new URLSearchParams({ page });
    if (metric) query.set('metric', metric);
    const data = await remote(target.origin, `/api/v1/leaderboard?${query}`);
    if (!Array.isArray(data?.entries) || data.entries.length > 50 ||
        ![data.page, data.pages, data.total].every((n) => Number.isSafeInteger(n) && n >= 0)) throw error(503, 'hall_unavailable');
    if (metric && data.metric !== metric) throw error(503, 'hall_unavailable');
    const entries = data.entries.map((item) => {
      const profileInput = { alias: item?.alias, badges: item?.badges, score: item?.score };
      if (Object.hasOwn(item || {}, 'stats')) profileInput.stats = item.stats;
      const profile = parseProfile(profileInput);
      if (!profile || !Number.isSafeInteger(item.rank) || item.rank < 1) throw error(503, 'hall_unavailable');
      if (metric && (!Number.isSafeInteger(item.value) || item.value < 0 || profile.stats?.[metric] !== item.value)) {
        throw error(503, 'hall_unavailable');
      }
      return { ...profile, rank: item.rank, ...(metric ? { value: item.value } : {}) };
    });
    return { entries, page: data.page, pages: data.pages, total: data.total, ...(metric ? { metric } : {}) };
  }

  async function preview(body) {
    if (!target) throw error(503, 'no_connection');
    if (!hasOnly(body, ['alias'])) throw error(400, 'bad_request');
    const alias = parseAlias(body.alias);
    if (!alias) throw error(400, 'invalid_alias');
    const view = await localView();
    const earned = view.badges.filter((badge) => badge.earnedAt).map((badge) => badge.id);
    const profile = parseProfile({ alias, badges: earned, score: view.score, stats: view.stats });
    if (!profile) throw error(409, 'no_badges');
    const publication = storage.read().publication;
    if (publication && publication.origin !== target.origin) throw error(409, 'destination_changed');
    const consentId = randomBytes(24).toString('hex');
    const time = now();
    for (const [id, value] of previews) if (value.expires <= time) previews.delete(id);
    if (previews.size >= 16) previews.delete(previews.keys().next().value);
    previews.set(consentId, { profile, expires: time + 10 * 60_000 });
    return { consentId, profile, destination: target.origin };
  }

  async function publish(body) {
    if (!hasOnly(body, ['consentId', 'consent']) || body.consent !== true) throw error(400, 'consent_required');
    if (!target) throw error(503, 'no_connection');
    if (target.kind !== 'public') throw error(409, 'preview_only');
    const prepared = previews.get(body.consentId);
    if (!prepared || prepared.expires <= now()) throw error(409, 'expired_preview');
    const release = storage.lock('sharing');
    try {
      previews.delete(body.consentId);
      const state = storage.update((current) => {
        if (current.publication && current.publication.origin !== target.origin) throw error(409, 'destination_changed');
        return {
          ...current, publication: {
            origin: target.origin, key: current.publication?.key || randomBytes(32).toString('hex'),
            alias: prepared.profile.alias, status: 'pending',
          },
        };
      });
      const result = await remote(target.origin, '/api/v1/entry', 'PUT', state.publication.key, { consent: true, profile: prepared.profile });
      if (!Number.isSafeInteger(result?.rank) || result.rank < 1 || !Number.isSafeInteger(result.total) || result.total < result.rank) {
        throw error(503, 'hall_unavailable');
      }
      storage.update((current) => ({ ...current, publication: { ...current.publication, status: 'published' } }));
      return { rank: result.rank, total: result.total };
    } finally { release(); }
  }

  async function withdraw(body) {
    if (!hasOnly(body, [])) throw error(400, 'bad_request');
    const release = storage.lock('sharing');
    try {
      const publication = storage.read().publication;
      if (!publication) return { removed: true };
      const result = await remote(publication.origin, '/api/v1/entry', 'DELETE', publication.key);
      if (result?.removed !== true) throw error(503, 'hall_unavailable');
      storage.update((current) => ({ ...current, publication: null }));
      previews.clear();
      return { removed: true };
    } finally { release(); }
  }

  async function handle(req, res, url, opts, watcher) {
    if (opts.privacy || opts.demo) { send(res, 404, { available: false }); return; }
    const route = url.pathname;
    const get = route === ROUTE || route === ROUTE + '/leaderboard';
    const post = ['/preview', '/publish', '/withdraw'].some((suffix) => route === ROUTE + suffix);
    if (!get && !post) { send(res, 404, { error: 'not_found' }); return; }
    if (req.method !== (post ? 'POST' : 'GET')) { send(res, 405, { error: 'method_not_allowed' }); return; }
    const sameOrigin = req.headers.origin === `http://${req.headers.host}`;
    if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && !sameOrigin) ||
        (post && (!sameOrigin || req.headers['x-whatsmyagentdoing'] !== 'achievements'))) {
      send(res, 403, { error: 'invalid_origin' }); return;
    }
    try {
      let result;
      if (route === ROUTE) {
        try { collect(watcher, true); } catch (cause) { if (cause?.code !== 'write_in_progress') throw cause; }
        result = await localView();
      } else if (get) {
        if ([...url.searchParams.keys()].some((key) => key !== 'page' && key !== 'metric') ||
            url.searchParams.getAll('page').length > 1 || url.searchParams.getAll('metric').length > 1) throw error(400, 'bad_request');
        const page = url.searchParams.get('page') || '1';
        if (!/^[1-9][0-9]{0,4}$/.test(page)) throw error(400, 'bad_request');
        const metric = url.searchParams.get('metric');
        if (metric !== null && !RANK_METRICS.includes(metric)) throw error(400, 'bad_request');
        result = await leaderboard(page, metric);
      } else {
        if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '') ||
            Number(req.headers['content-length']) > 2048) throw error(400, 'bad_request');
        const body = await limitedJSON(req, 2048, 400, 'bad_request');
        if (route.endsWith('/preview')) result = await preview(body);
        else if (route.endsWith('/publish')) result = await publish(body);
        else result = await withdraw(body);
      }
      send(res, 200, result);
    } catch (cause) {
      send(res, cause?.status || 503, { error: cause?.status ? cause.code : 'storage_unavailable' });
    }
  }
  return { attach, handle };
}

module.exports = { createAchievements };
