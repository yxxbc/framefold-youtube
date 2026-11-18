/**
 * Builds dist/ — the unpacked extension that `edge://extensions` /
 * `chrome://extensions` load and that both store dashboards accept as a zip.
 *
 *   node scripts/build.mjs               content script, popup, manifest, icons
 *   node scripts/build.mjs --production  same, minified, no source map (store packages)
 *
 * Every file copied in is listed here on purpose: store review compares the package
 * against the manifest, and stray files (probe scripts, notes) have no business in it.
 */
import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const production = process.argv.includes('--production');
const out = 'dist';

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: {
    content: 'src/content/main.ts',
    popup: 'src/popup/popup.ts',
  },
  bundle: true,
  outdir: out,
  format: 'iife',
  target: ['chrome111'],
  charset: 'utf8',
  loader: { '.css': 'text' },
  minify: production,
  sourcemap: production ? false : 'linked',
  logLevel: 'info',
});

// Ordinary files referenced by the manifest, copied under their own names.
for (const file of ['src/manifest.json', 'src/popup/popup.html', 'src/popup/popup.css']) {
  await cp(file, `${out}/${file.split('/').pop()}`);
}
await cp('LICENSE', `${out}/LICENSE`);

// Icon files. `icon-32-mono.png` is the tab-facing mark: Chromium strips the background
// of action icons, so a tile icon would cover the toolbar strip with flat colour.
await mkdir(`${out}/icons`, { recursive: true });
await cp('src/icons/icon-32-mono.png', `${out}/icons/icon-tab-32.png`);
for (const size of [16, 32, 48, 128]) {
  await cp(`src/icons/icon-${size}.png`, `${out}/icons/icon-${size}.png`);
}

for (const required of ['content.js', 'popup.js', 'popup.html', 'popup.css', 'manifest.json', 'icons/icon-16.png', 'icons/icon-tab-32.png']) {
  if (!existsSync(`${out}/${required}`)) throw new Error(`${required} missing from dist/`);
}
console.log(`built dist/${production ? ' (production)' : ''}`);
