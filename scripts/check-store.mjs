/**
 * Store pre-submission check. Validates what the Chrome Web Store and the Edge Add-ons
 * dashboard reject packages for before upload, so those clicks do not come back as an
 * email three days later.
 *
 *   npm run check:store
 *
 * Package rules (both stores): manifest v3, ≤128 MB root zip, ≤2 GB unpacked, ASCII file
 * names without CJK, and no per-store identifiers in the shared build. Store dashboards
 * have no headless API; listing text and screenshots still go in by hand
 * (see docs/PUBLISHING.md).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Edge fills these in on download/import; shipping them in our own zip makes the
// other store reject the package.
const FOREIGN_METADATA = ['_metadata', '.DS_Store', '__MACOSX'];

let failed = 0;
const fail = (msg) => (failed++, console.error(`FAIL ${msg}`));
const pass = (msg) => console.log(`ok   ${msg}`);

function walk(dir, base = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    return ent.isDirectory() ? walk(join(dir, ent.name), rel) : [rel];
  });
}

for (const store of ['chrome', 'edge']) {
  const zip = `framefold-youtube-${store}.zip`;
  if (!existsSync(zip)) {
    fail(`${zip} missing — run npm run pack`);
    continue;
  }
  const size = statSync(zip).size;
  if (size > 128 * 1024 * 1024) fail(`${zip} is ${size} bytes; limit is 128 MB`);
  else pass(`${zip} present, ${(size / 1024).toFixed(1)} KiB`);
}

const files = walk('dist').filter((file) => file !== 'framefold-youtube-test.zip');
let unpacked = 0;
for (const rel of files) {
  const { size } = statSync(join('dist', rel));
  unpacked += size;
  if (!/^[\w\-. /]+$/.test(rel)) fail(`non-ASCII or unusual file name: ${rel}`);
  if (FOREIGN_METADATA.includes(rel) || rel.startsWith('__MACOSX/')) fail(`store-owned entry in package: ${rel}`);
}
if (unpacked > 2 * 1024 * 1024 * 1024) fail('unpacked size over 2 GB');
else pass(`unpacked ${(unpacked / 1024).toFixed(1)} KiB across ${files.length} files`);

const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
for (const key of ['update_url', 'key']) {
  // Edge and Chrome both treat a baked-in update_url/key as a supply-chain problem for
  // packages they did not sign; each store injects its own on re-download.
  if (key in manifest) fail(`manifest carries "${key}", which one of the stores will reject`);
}
if (!manifest.icons?.['128']) fail('icons.128 is required for the store listing');
if (!manifest.action?.default_icon) fail('action.default_icon missing: the toolbar shows a grey square');

// Remote code: both stores reject fetching and eval'ing code. Our bundles are static.
for (const file of ['content.js', 'popup.js']) {
  if (!existsSync(join('dist', file))) continue;
  const code = readFileSync(join('dist', file), 'utf8');
  if (/\beval\s*\(|new\s+Function\s*\(/.test(code)) fail(`${file} contains eval/new Function`);
  if (/\.src\s*=\s*['"]https?:/.test(code)) fail(`${file} loads remote script`);
}
if (!failed) pass('no remote code or eval in bundles');

// Things the reviewer reads next to the upload.
if (!existsSync('docs/PRIVACY.md')) fail('docs/PRIVACY.md missing: both stores need a privacy statement');
else {
  const privacy = readFileSync('docs/PRIVACY.md', 'utf8');
  if (!/storage/.test(privacy) || !/youtube\.com/.test(privacy)) fail('docs/PRIVACY.md must name the permission and host');
  else pass('privacy statement names the permission and host');
}
for (const icon of ['icon-128.png', 'icon-256.png']) {
  if (!existsSync(join('src/icons', icon))) fail(`src/icons/${icon} missing (store listing icon)`);
  else pass(`listing icon ${icon}`);
}

if (failed) {
  console.error(`\n${failed} problem(s) — see the Chrome Web Store / Edge Add-ons policies in docs/PUBLISHING.md`);
  process.exit(1);
}
console.log('\nstore package checks passed');
