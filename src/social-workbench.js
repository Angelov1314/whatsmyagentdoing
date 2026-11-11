'use strict';

const { spawn } = require('node:child_process');
const http = require('node:http');
const { homedir } = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const workbenchPort = 8769;
const actionNames = new Set([
  'account', 'bind', 'unbind', 'publication', 'screenshot',
  'remove_publication', 'chats', 'sync',
]);
const screenshotLimit = 8 * 1024 * 1024;
const maxRequestBytes = Math.ceil(screenshotLimit * 4 / 3) + 16 * 1024;
const maxSnapshotBytes = 4 * 1024 * 1024;
const workbenchDirectory = path.join(homedir(), 'Projects', 'local-dashboard');
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const upstreamError = Object.assign(new Error('Workbench response exceeded its size limit'), { status: 502 });

function probe(port) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: '/api/workbench/health', timeout: 500 }, (response) => {
      const dashboard = /^LocalDashboard\/1\s*$/.test(response.headers.server || '');
      response.resume();
      if (response.statusCode === 200 && dashboard) resolve(true);
      else reject(new Error('unexpected workbench response'));
    });
    request.on('timeout', () => request.destroy(new Error('workbench timed out')));
    request.on('error', (error) => error.code === 'ECONNREFUSED' ? resolve(false) : reject(error));
  });
}

async function startWorkbench(port) {
  if (await probe(port)) return;
  const child = spawn(path.join(workbenchDirectory, 'start.command'), [], {
    cwd: workbenchDirectory, detached: true, stdio: 'ignore',
  });
  let failed = false;
  child.on('error', () => { failed = true; });
  child.on('exit', () => { failed = true; });
  child.unref();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(200);
    if (await probe(port)) return;
    if (failed) break;
  }
  throw new Error('workbench unavailable');
}

async function readBody(request, maxBytes) {
  const headerLength = request.headers['content-length'];
  if (headerLength !== undefined && (!/^\d+$/.test(headerLength) || Number(headerLength) > maxBytes)) {
    request.resume();
    throw Object.assign(new Error('Request body too large'), { status: 413 });
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let tooLarge = false;
    request.on('data', (chunk) => {
      if (tooLarge) return;
      total += chunk.length;
      if (total > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (tooLarge) reject(Object.assign(new Error('Request body too large'), { status: 413 }));
      else resolve(Buffer.concat(chunks, total));
    });
    request.on('error', () => reject(Object.assign(new Error('Invalid request body'), { status: 400 })));
    request.on('aborted', () => reject(Object.assign(new Error('Request body aborted'), { status: 400 })));
  });
}

async function fetchWorkbench(port, pathname, method, body) {
  return new Promise((resolve, reject) => {
    const headers = {
      host: `127.0.0.1:${port}`,
      origin: `http://127.0.0.1:${port}`,
    };
    if (method === 'POST') {
      headers['content-type'] = 'application/json';
      headers['content-length'] = body.length;
    }
    const request = http.request({
      host: '127.0.0.1',
      port,
      path: pathname,
      method,
      headers,
      timeout: 12_000,
    }, async (response) => {
      const type = (response.headers['content-type'] || '').split(';', 1)[0].toLowerCase();
      const isMedia = /^\/api\/workbench\/media\/[a-f0-9]{64}$/.test(pathname);
      const allowedType = isMedia && response.statusCode === 200 ? imageTypes.has(type) : type === 'application/json';
      const limit = isMedia ? screenshotLimit : maxSnapshotBytes;
      const chunks = [];
      let size = 0;
      try {
        for await (const chunk of response) {
          size += chunk.length;
          if (size > limit) throw upstreamError;
          chunks.push(chunk);
        }
      } catch (error) {
        reject(error);
        return;
      }
      if (!allowedType) {
        reject(new Error('Unexpected workbench response type'));
        return;
      }
      resolve({
        status: response.statusCode,
        contentType: type,
        body: Buffer.concat(chunks, size),
      });
    });
    request.on('timeout', () => request.destroy(new Error('workbench timed out')));
    request.on('error', reject);
    if (body.length) request.write(body);
    request.end();
  });
}

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': contentType,
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'same-origin',
  });
  res.end(body);
}

function createSocialWorkbenchBridge({ port = workbenchPort, start = () => startWorkbench(port) } = {}) {
  let starting;
  const ensureReady = () => {
    starting ||= Promise.resolve().then(start).finally(() => { starting = undefined; });
    return starting;
  };

  async function handle(request, response, url, options) {
    if (options.privacy || options.demo) {
      response.writeHead(404).end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/social-workbench/status') {
      response.writeHead(204, { 'cache-control': 'no-store' }).end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/social-workbench') {
      await ensureReady();
      const upstream = await fetchWorkbench(port, '/api/workbench', 'GET', Buffer.alloc(0));
      send(response, upstream.status, upstream.body);
      return;
    }

    const media = /^\/api\/social-workbench\/media\/([a-f0-9]{64})$/.exec(url.pathname);
    if (request.method === 'GET' && media) {
      await ensureReady();
      const upstream = await fetchWorkbench(port, `/api/workbench/media/${media[1]}`, 'GET', Buffer.alloc(0));
      send(response, upstream.status, upstream.body, upstream.contentType);
      return;
    }

    const action = /^\/api\/social-workbench\/([a-z_]+)$/.exec(url.pathname);
    if (request.method !== 'POST' || !action || !actionNames.has(action[1])) {
      send(response, 404, Buffer.from('{"error":"not_found"}'));
      return;
    }
    if ((request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
      send(response, 415, Buffer.from('{"error":"unsupported_media_type"}'));
      return;
    }
    if (request.headers.origin !== `http://${request.headers.host}`
        || request.headers['x-whatsmyagentdoing'] !== 'social-workbench') {
      send(response, 403, Buffer.from('{"error":"invalid_origin"}'));
      return;
    }

    const body = await readBody(request, maxRequestBytes);
    await ensureReady();
    const upstream = await fetchWorkbench(port, `/api/workbench/${action[1]}`, 'POST', body);
    send(response, upstream.status, upstream.body);
  }

  return { handle };
}

module.exports = { createSocialWorkbenchBridge };
