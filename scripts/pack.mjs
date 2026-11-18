/**
 * Packages dist/ once per store. The zip roots at the extension files themselves — the
 * stores require manifest.json at the archive root, not inside a folder.
 *
 *   npm run pack        production build (minified, no source maps) → framefold-youtube-chrome.zip
 *   npm run pack:dev    development build (keeps .map files) for side-loading and debugging
 *
 * The two stores use separate file names only so each dashboard can hold its own upload
 * history; the contents are identical (see scripts/check-store.mjs).
 * A copy in dist/ is created after packaging so it cannot enter either store archive.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dev = process.argv.includes('--dev');
execFileSync('node', ['scripts/build.mjs', ...(dev ? [] : ['--production'])], { stdio: 'inherit' });

for (const store of ['chrome', 'edge']) {
  const zip = `framefold-youtube-${store}.zip`;
  const target = join(process.cwd(), zip);
  rmSync(target, { force: true });
  // Zip from inside dist/ so manifest.json sits at the archive root, as the stores require.
  // -X keeps .DS_Store and Finder metadata out; Linux CI zips the same way.
  execFileSync('zip', ['-9qrX', target, '.'], { cwd: 'dist', stdio: 'inherit' });
  console.log(`${zip}  ${(statSync(target).size / 1024).toFixed(1)} KiB`);
}

copyFileSync('framefold-youtube-chrome.zip', 'dist/framefold-youtube-test.zip');
console.log('dist/framefold-youtube-test.zip');
