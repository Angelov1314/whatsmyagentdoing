'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_MANIFEST_BYTES = 32 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_DATA_BYTES = 2 * 1024 * 1024;
const MAX_WORKFLOWS = 500;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKILL_NAME = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;

function inside(root, candidate) {
  return candidate.startsWith(root + path.sep);
}

function readRegularFile(file, rootReal, maxBytes) {
  let stat;
  try { stat = fs.lstatSync(file); } catch { return null; }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > maxBytes) return null;

  let real;
  try { real = fs.realpathSync(file); } catch { return null; }
  if (!inside(rootReal, real)) return null;

  let fd;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fd = fs.openSync(file, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.size > maxBytes) return null;
    const bytes = fs.readFileSync(fd);
    return bytes.length <= maxBytes ? bytes : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function validText(value, maxLength, required = false) {
  if (typeof value !== 'string' || value.length > maxLength || (required && !value.trim())) return false;
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

function validManifest(raw, slug) {
  if (!raw || raw.version !== 1 || raw.id !== slug || !SLUG.test(slug)) return false;
  if (!validText(raw.title, 160, true) || !validText(raw.description, 1200)) return false;
  if (raw.html !== 'index.html' || raw.data !== 'workflow.json') return false;
  if (!Array.isArray(raw.skills) || raw.skills.length > 120) return false;
  if (raw.skills.some((name) => typeof name !== 'string' || !SKILL_NAME.test(name))) return false;
  if (typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256)) return false;
  if (typeof raw.updatedAt !== 'string') return false;
  const updatedAt = new Date(raw.updatedAt);
  if (!Number.isFinite(updatedAt.getTime()) || updatedAt.toISOString() !== raw.updatedAt) return false;
  return true;
}

function createWorkflowCanvas({ root = path.join(os.homedir(), '.whatsmyagentdoing', 'workflows') } = {}) {
  const catalogRoot = path.resolve(root);

  function checkedRoot() {
    let stat;
    try { stat = fs.lstatSync(catalogRoot); } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
    try { return fs.realpathSync(catalogRoot); } catch { return null; }
  }

  function get(slug) {
    if (typeof slug !== 'string' || !SLUG.test(slug) || slug.length > 80) return null;
    const rootReal = checkedRoot();
    if (!rootReal) return null;

    const dir = path.join(catalogRoot, slug);
    let dirStat;
    try { dirStat = fs.lstatSync(dir); } catch { return null; }
    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) return null;
    let dirReal;
    try { dirReal = fs.realpathSync(dir); } catch { return null; }
    if (!inside(rootReal, dirReal)) return null;

    const manifestBytes = readRegularFile(path.join(dir, 'manifest.json'), rootReal, MAX_MANIFEST_BYTES);
    if (!manifestBytes) return null;
    let manifest;
    try { manifest = JSON.parse(manifestBytes.toString('utf8')); } catch { return null; }
    if (!validManifest(manifest, slug)) return null;

    const html = readRegularFile(path.join(dir, manifest.html), rootReal, MAX_HTML_BYTES);
    const data = readRegularFile(path.join(dir, manifest.data), rootReal, MAX_DATA_BYTES);
    if (!html || !data) return null;
    if (crypto.createHash('sha256').update(html).digest('hex') !== manifest.sha256) return null;

    return {
      id: manifest.id,
      title: manifest.title,
      description: manifest.description,
      skills: [...manifest.skills],
      updatedAt: manifest.updatedAt,
      sha256: manifest.sha256,
      html,
    };
  }

  function catalog() {
    const rootReal = checkedRoot();
    if (!rootReal) return [];
    const entries = fs.readdirSync(catalogRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && SLUG.test(entry.name))
      .slice(0, MAX_WORKFLOWS)
      .map((entry) => get(entry.name))
      .filter(Boolean)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return entries.map(({ id, title, description, skills, updatedAt }) => ({
      id, title, description, skills, updatedAt, url: `/workflow-canvas/${id}`,
    }));
  }

  return Object.freeze({ catalog, get });
}

module.exports = { createWorkflowCanvas };
