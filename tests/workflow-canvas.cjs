const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter, once } = require('node:events');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createServer } = require('../src/server');
const { createWorkflowCanvas } = require('../src/workflow-canvas');

function fixture(t, opts = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wmad-workflows-'));
  const root = path.join(home, 'workflows');
  fs.mkdirSync(root);
  const watcher = new EventEmitter();
  watcher.sessions = () => [];
  const server = createServer(watcher, opts, { workflowCanvas: createWorkflowCanvas({ root }) });
  server.listen(0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(home, { recursive: true, force: true });
  });
  return { home, root, server };
}

function addWorkflow(root, id, { html = '<!doctype html><title>Graph</title>', skills = ['workflow-canvas'], data = '{}' } = {}) {
  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'workflow.json'), data);
  const manifest = {
    version: 1,
    id,
    title: `Workflow ${id}`,
    description: 'A test graph',
    skills,
    html: 'index.html',
    data: 'workflow.json',
    sha256: crypto.createHash('sha256').update(Buffer.from(html)).digest('hex'),
    updatedAt: '2026-11-11T08:00:00.000Z',
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  return { dir, manifest };
}

async function request(server, pathname, method = 'GET') {
  if (!server.listening) await once(server, 'listening');
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      method,
      path: pathname,
      headers: { host: `127.0.0.1:${server.address().port}` },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error(`Request timed out: ${method} ${pathname}`)));
    req.end();
  });
}

test('workflow catalog returns safe metadata and verified HTML with bounded framing', async (t) => {
  const { root, server } = fixture(t);
  const html = '<!doctype html><meta charset="utf-8"><title>Local graph</title><script>window.graph=true</script>';
  addWorkflow(root, 'workflow-canvas', { html, skills: ['workflow-canvas', 'design-taste-frontend'] });
  await once(server, 'listening');

  const catalog = await request(server, '/api/workflows');
  assert.equal(catalog.status, 200);
  assert.equal(catalog.headers['cache-control'], 'no-store');
  assert.equal(catalog.headers['x-content-type-options'], 'nosniff');
  const parsed = JSON.parse(catalog.body);
  assert.deepEqual(parsed.workflows, [{
    id: 'workflow-canvas',
    title: 'Workflow workflow-canvas',
    description: 'A test graph',
    skills: ['workflow-canvas', 'design-taste-frontend'],
    updatedAt: '2026-11-11T08:00:00.000Z',
    url: '/workflow-canvas/workflow-canvas',
  }]);
  assert.equal(catalog.body.toString().includes(root), false);

  for (const [url, file, type] of [
    ['/workflow-canvas.js', 'public/workflow-canvas.js', 'text/javascript; charset=utf-8'],
    ['/workflow-canvas.css', 'public/workflow-canvas.css', 'text/css; charset=utf-8'],
  ]) {
    const asset = await request(server, url);
    assert.equal(asset.status, 200, url);
    assert.equal(asset.headers['content-type'], type);
    assert.equal(asset.headers['cache-control'], 'no-store');
    assert.equal(asset.headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(asset.body, fs.readFileSync(path.join(__dirname, '..', file)));
  }

  const standalone = await request(server, '/workflow-canvas/workflow-canvas');
  assert.equal(standalone.status, 200);
  assert.equal(standalone.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(standalone.headers['cache-control'], 'no-store');
  assert.equal(standalone.headers['x-content-type-options'], 'nosniff');
  assert.equal(standalone.headers['x-frame-options'], 'DENY');
  assert.match(standalone.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.match(standalone.headers['content-security-policy'], /connect-src 'none'/);
  assert.deepEqual(standalone.body, Buffer.from(html));

  const embedded = await request(server, '/workflow-canvas/workflow-canvas?embed=1');
  assert.equal(embedded.status, 200);
  assert.equal(embedded.headers['x-frame-options'], 'SAMEORIGIN');
  assert.match(embedded.headers['content-security-policy'], /frame-ancestors 'self'/);
  assert.equal((await request(server, '/workflow-canvas/workflow-canvas?embed=0')).status, 400);
  assert.equal((await request(server, '/workflow-canvas/workflow-canvas?embed=1&embed=1')).status, 400);
});

test('workflow routes reject writes and path traversal', async (t) => {
  const { root, server } = fixture(t);
  addWorkflow(root, 'workflow-canvas');
  await once(server, 'listening');

  assert.equal((await request(server, '/api/workflows', 'POST')).status, 405);
  assert.equal((await request(server, '/workflow-canvas/workflow-canvas', 'POST')).status, 405);
  assert.equal((await request(server, '/workflow-canvas/%2e%2e%2fsecret')).status, 404);
  assert.equal((await request(server, '/workflow-canvas/workflow-canvas%2f..%2f..%2fsecret')).status, 404);
});

test('private and demo modes hide the launcher and deny discovery and document routes', async (t) => {
  for (const opts of [{ privacy: true }, { demo: true }]) {
    await t.test(Object.keys(opts)[0], async (subtest) => {
      const { root, server } = fixture(subtest, opts);
      addWorkflow(root, 'workflow-canvas');
      await once(server, 'listening');
      const page = await request(server, '/');
      assert.equal(page.status, 200);
      assert.match(page.body.toString(), /data-workflow-canvas-disabled="true"/);
      assert.equal((await request(server, '/api/workflows')).status, 403);
      assert.equal((await request(server, '/workflow-canvas/workflow-canvas')).status, 403);
    });
  }
});

test('missing or modified workflow files do not appear or serve', async (t) => {
  const { root, server } = fixture(t);
  const changed = addWorkflow(root, 'modified');
  fs.writeFileSync(path.join(changed.dir, 'index.html'), '<title>changed</title>');
  const missing = addWorkflow(root, 'missing');
  fs.unlinkSync(path.join(missing.dir, 'workflow.json'));
  const empty = await createWorkflowCanvas({ root }).catalog();
  assert.deepEqual(empty, []);
  await once(server, 'listening');

  assert.deepEqual(JSON.parse((await request(server, '/api/workflows')).body).workflows, []);
  assert.equal((await request(server, '/workflow-canvas/modified')).status, 404);
  assert.equal((await request(server, '/workflow-canvas/missing')).status, 404);
});

test('symlinked workflow directories and files never enter the catalog or serve', async (t) => {
  const { root, home, server } = fixture(t);
  const outside = path.join(home, 'outside');
  addWorkflow(path.dirname(outside), path.basename(outside));
  fs.symlinkSync(outside, path.join(root, 'linked-directory'), 'dir');

  const fileLink = addWorkflow(root, 'linked-file');
  fs.unlinkSync(path.join(fileLink.dir, 'index.html'));
  fs.symlinkSync(path.join(outside, 'index.html'), path.join(fileLink.dir, 'index.html'));
  const manifestLink = addWorkflow(root, 'linked-manifest');
  fs.unlinkSync(path.join(manifestLink.dir, 'manifest.json'));
  fs.symlinkSync(path.join(outside, 'manifest.json'), path.join(manifestLink.dir, 'manifest.json'));
  await once(server, 'listening');

  assert.deepEqual(JSON.parse((await request(server, '/api/workflows')).body).workflows, []);
  for (const id of ['linked-directory', 'linked-file', 'linked-manifest']) {
    assert.equal((await request(server, `/workflow-canvas/${id}`)).status, 404);
  }
});
