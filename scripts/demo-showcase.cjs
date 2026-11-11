// Local showcase only: synthetic sessions and fictional skills, no personal data.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DemoWatcher } = require('../src/demo');
const { createServer } = require('../src/server');
const { createLibrary } = require('../src/library');
const { createAchievements } = require('../src/achievements');
const { createWorkflowCanvas } = require('../src/workflow-canvas');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'myoffice-showcase-'));
const examples = [
  ['component-builder', 'Build and test a UI component.'],
  ['api-debug', 'Debug an API request and check its response.'],
  ['code-review', 'Review code changes for correctness.'],
  ['design-studio', 'Explore a visual design system.'],
  ['figma-notes', 'Keep design decisions readable.'],
  ['video-captions', 'Prepare readable video captions.'],
  ['article-writer', 'Write a clear article.'],
  ['research-notes', 'Research a question using primary sources.'],
  ['office-planner', 'Organize everyday tasks.'],
  ['game-prototype', 'Build a small game prototype.'],
];
for (const [name, description] of examples) {
  const dir = path.join(root, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nThis is a fictional skill used only for the public MyOffice demo.\n\n## A small workflow\n\n1. Understand the task.\n2. Create a focused first version.\n3. Check the result in the actual app.\n\nNo private instructions or real session records are included.\n`);
}
const watcher = new DemoWatcher().start();
const unavailable = { async handle(req, res) {
  res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Not connected in this synthetic showcase' }));
} };
const server = createServer(watcher, { privacy: false, demo: false }, {
  library: createLibrary({ roots: [{ path: path.join(root, 'skills'), label: 'Fictional demo skills' }] }),
  achievements: createAchievements({ dataDir: path.join(root, 'state'), origin: null,
    usageSummary: async () => ({ tokens: 25000, projects: 4 }) }),
  socialWorkbenchBridge: unavailable,
  codexUsageBridge: unavailable,
  workflowCanvas: createWorkflowCanvas({ root: path.join(root, 'workflows') }),
});
server.listen(Number(process.env.PORT || 0), '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}`;
  if (process.env.MYOFFICE_DEMO_URL_FILE) fs.writeFileSync(process.env.MYOFFICE_DEMO_URL_FILE, url);
  console.log(`Synthetic showcase: ${url}`);
  console.log('All sessions and local skills are fictional. The board is explicitly a sample. No public submissions or external companion services are enabled.');
});
function stop() {
  watcher.stop();
  server.closeAllConnections();
  server.close(() => { fs.rmSync(root, { recursive: true, force: true }); process.exit(0); });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
