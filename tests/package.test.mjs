/**
 * Package checks that need no network and no browser: the bits a store reviewer and
 * Chromium itself look at before any of our code runs.
 *
 *   npm test        (runs after the build)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
const read = (p) => readFileSync(join(dist, p));

function files() {
  const out = [];
  const walk = (base) => {
    for (const ent of readdirSync(join(dist, base), { withFileTypes: true })) {
      const rel = base ? `${base}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(rel);
      else out.push(rel);
    }
  };
  walk('');
  return out;
}

test('manifest is a valid MV3 manifest within the current policy limits', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.name, /Framefold/);
  assert.match(manifest.version, /^\d+(\.\d+){0,3}$/, 'version must be 1–4 dot-separated integers');
  assert.ok(manifest.description.length > 0 && manifest.description.length <= 132, 'description ≤ 132 chars');
});

test('version matches the released changelog entry', () => {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  assert.match(changelog, new RegExp(`^## ${manifest.version.replace(/\./g, '\\.')}\\b`, 'm'));
});

test('declares the narrowest permissions that work', () => {
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://www.youtube.com/*']);
  assert.equal(manifest.background, undefined, 'no service worker is needed');
  assert.equal(manifest.web_accessible_resources, undefined);
});

test('remote code is not loaded and no inline script is used', () => {
  for (const file of ['content.js', 'popup.js']) {
    const code = read(file).toString('utf8');
    assert.doesNotMatch(code, /\bimport\s*\(/, `${file} must not dynamically import`);
  }
  const html = read('popup.html').toString('utf8');
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, 'popup.html must not inline script');
});

test('every file the manifest references ships in dist/', () => {
  const refs = new Set();
  const walk = (v) => {
    if (typeof v === 'string') refs.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(manifest.action);
  walk(manifest.icons);
  walk(manifest.content_scripts);
  const present = new Set(files());
  for (const ref of refs) {
    if (!/\.[a-z]+$/.test(ref)) continue;
    assert.ok(present.has(ref), `manifest references ${ref}, which is not in dist/`);
  }
});

test('dist/ contains only extension files and the test archive', () => {
  const allowed = /^(content|popup)\.js(\.map)?$|^popup\.(html|css)$|^manifest\.json$|^icons\/icon-[a-z0-9-]+\.png$|^LICENSE$|^framefold-youtube-test\.zip$/;
  for (const file of files()) assert.match(file, allowed, `unexpected file in dist/: ${file}`);
  assert.ok(statSync(join(dist, 'content.js')).size < 200_000, 'content.js unexpectedly large');
});
