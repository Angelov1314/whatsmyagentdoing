const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { CATEGORY_ORDER, createLibrary, discoverRoots } = require('../src/library');
const { createServer } = require('../src/server');

function skillText(name, description, body) {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;
}

function writeSkill(root, folder, name, description, body = '# Notes') {
  const dir = path.join(root, folder);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'SKILL.md');
  fs.writeFileSync(file, skillText(name, description, body));
  return file;
}

function startServer(library) {
  const watcher = { on() {}, sessions() { return []; } };
  const server = createServer(watcher, { privacy: false }, { library });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

test('catalog groups valid instructions, merges exact docs and symlink aliases, and keeps same-name variants distinct', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wmad-library-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const first = path.join(home, 'codex-skills');
  const second = path.join(home, 'agent-skills');
  fs.mkdirSync(first, { recursive: true }); fs.mkdirSync(second, { recursive: true });
  const original = writeSkill(first, 'dev/local', 'local-book', 'Use when doing code development.', '# Local notes\n\nKeep this final line.');
  const exactCopy = path.join(second, 'copy/SKILL.md');
  fs.mkdirSync(path.dirname(exactCopy), { recursive: true });
  fs.copyFileSync(original, exactCopy);
  fs.symlinkSync(path.dirname(original), path.join(second, 'alias'), 'dir');
  writeSkill(first, 'same-name/first', 'twin-book', 'Use for local tests.', '# First');
  writeSkill(first, 'same-name/second', 'twin-book', 'Use for local tests.', '# Second');
  writeSkill(first, 'same-name/first/examples/nested', 'nested-example', 'A sample document.', '# Example');
  fs.mkdirSync(path.join(first, 'broken'), { recursive: true });
  fs.writeFileSync(path.join(first, 'broken', 'SKILL.md'), '---\nname: broken\n');
  fs.mkdirSync(path.join(first, 'oversize'), { recursive: true });
  fs.writeFileSync(path.join(first, 'oversize', 'SKILL.md'), skillText('oversize', 'ignored', 'x'.repeat(1024 * 1024 + 5)));

  const library = createLibrary({ roots: [
    { path: first, label: 'Codex' },
    { path: second, label: 'Agent skills' },
  ] });
  const categories = library.catalog();
  assert.deepEqual(categories.map((category) => category.id), CATEGORY_ORDER);
  const all = categories.flatMap((category) => category.skills);
  assert.equal(all.filter((book) => book.name === 'local-book').length, 1, 'byte-identical copies share a book');
  assert.equal(all.filter((book) => book.name === 'twin-book').length, 2, 'different instructions with the same name remain separate');
  assert.equal(all.some((book) => book.name === 'nested-example'), false, 'examples inside a skill are not independent installs');
  assert.equal(all.some((book) => book.name === 'broken' || book.name === 'oversize'), false);
  const local = all.find((book) => book.name === 'local-book');
  assert.ok(categories.find((category) => category.id === 'development').skills.some((book) => book.id === local.id));
  assert.equal(local.sources.length, 3, 'both install paths and a symlink alias are retained');
  assert.equal(local.sources.some((source) => source.startsWith('Codex / ')), true);
  assert.equal(local.sources.some((source) => source.startsWith('Agent skills / ')), true);
  const detail = library.getSkill(local.id);
  assert.equal(detail.body, '# Local notes\n\nKeep this final line.\n');
  assert.deepEqual(detail.sources, [...detail.sources].sort());
  assert.equal(library.getSkill('../../etc/passwd'), null);
  assert.equal(library.getSkill(`${local.id}x`), null);
});

test('discovers only enabled Codex plugin versions and registered Claude plugin installs', (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wmad-plugin-library-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const config = path.join(home, '.codex', 'config.toml');
  fs.mkdirSync(path.dirname(config), { recursive: true });
  fs.writeFileSync(config, [
    '[plugins."sample@fixture"]', 'enabled = true', '',
    '[plugins."disabled@fixture"]', 'enabled = false', '',
    '[marketplaces."fixture"]', `source = "${path.join(home, 'marketplace')}"`, '',
  ].join('\n'));

  const cache = path.join(home, '.codex', 'plugins', 'cache', 'fixture');
  writeSkill(path.join(cache, 'sample', '1.0.0', 'skills'), 'old', 'old-plugin-book', 'old registered version');
  writeSkill(path.join(cache, 'sample', '2.1.0', 'skills'), 'current', 'current-plugin-book', 'current registered version');
  writeSkill(path.join(cache, 'disabled', '1.0.0', 'skills'), 'skill', 'disabled-plugin-book', 'disabled plugin');
  writeSkill(path.join(cache, 'unregistered', '1.0.0', 'skills'), 'skill', 'unregistered-plugin-book', 'not in registry');

  const claudeInstall = path.join(home, '.claude', 'plugins', 'cache', 'sample-plugin');
  writeSkill(claudeInstall, 'skills/claude-book', 'claude-plugin-book', 'installed through Claude registry');
  const registry = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
  fs.mkdirSync(path.dirname(registry), { recursive: true });
  fs.writeFileSync(registry, JSON.stringify({ plugins: { 'sample-plugin@marketplace': [{ installPath: claudeInstall }] } }));

  const roots = discoverRoots(home);
  assert.equal(roots.some((root) => root.label === 'Codex plugin: sample'), true);
  assert.equal(roots.some((root) => root.label === 'Claude plugin: sample-plugin@marketplace'), true);
  const all = createLibrary({ home }).catalog().flatMap((category) => category.skills);
  const names = new Set(all.map((book) => book.name));
  assert.equal(names.has('current-plugin-book'), true);
  assert.equal(names.has('old-plugin-book'), false, 'only the newest installed version is scanned');
  assert.equal(names.has('disabled-plugin-book'), false);
  assert.equal(names.has('unregistered-plugin-book'), false);
  assert.equal(names.has('claude-plugin-book'), true);
});

test('HTTP library endpoints return only whitelisted skills and static library assets', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wmad-library-http-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const root = path.join(home, 'skills');
  writeSkill(root, 'research', 'research-book', 'Use for focused research.', '# Research body');
  const library = createLibrary({ roots: [{ path: root, label: 'Fixture' }] });
  const { server, origin } = await startServer(library);
  t.after(() => new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  }));

  const response = await fetch(`${origin}/api/library`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const catalog = await response.json();
  assert.deepEqual(catalog.categories.map((category) => category.id), CATEGORY_ORDER);
  const book = catalog.categories.flatMap((category) => category.skills).find((item) => item.name === 'research-book');
  assert.ok(book);

  const detailResponse = await fetch(`${origin}/api/library/skill?id=${encodeURIComponent(book.id)}`);
  assert.equal(detailResponse.status, 200);
  assert.equal((await detailResponse.json()).skill.body, '# Research body\n');
  const traversal = await fetch(`${origin}/api/library/skill?id=${encodeURIComponent('../../etc/passwd')}`);
  assert.equal(traversal.status, 404);
  const method = await fetch(`${origin}/api/library`, { method: 'POST' });
  assert.equal(method.status, 405);

  for (const asset of ['library.js', 'library.css']) {
    const result = await fetch(`${origin}/${asset}`);
    assert.equal(result.status, 200, `${asset} is registered in the static allowlist`);
    assert.ok((await result.text()).length > 0);
  }
});
