import { spawnSync } from 'node:child_process';

/**
 * npm test — everything that runs without a network or a display.
 *
 * Builds the package, then checks it: manifest policy, permissions, what ships in dist/,
 * and that Chromium actually loads the build as an extension. The live run against
 * youtube.com needs a GUI session and the network, so it stays a separate command
 * (npm run test:e2e).
 */
for (const args of [
  ['scripts/build.mjs'],
  ['--test', 'tests/package.test.mjs'],
  ['tests/load.mjs'],
]) {
  const r = spawnSync('node', args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
