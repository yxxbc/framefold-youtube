/**
 * Does Chromium load this build as an extension at all?
 *
 * The store reviews fail here first when a manifest points at a missing icon, a filename
 * was renamed, or `minimum_chrome_version` is wrong — all of which a type check cannot
 * see. Opens the extensions page, finds the unpacked entry, and opens the popup through
 * its real chrome-extension:// URL.
 *
 *   node tests/load.mjs
 *
 * Needs a GUI session: Chromium only loads unpacked extensions in headed mode.
 */
import assert from 'node:assert/strict';
import { launchWithExtension } from './harness.mjs';

const { ctx, popup, extensionId } = await launchWithExtension();
try {
  assert.match(extensionId, /^[a-p]{32}$/, `unexpected extension id ${extensionId}`);
  console.log(`ok   extension loaded (id ${extensionId})`);

  const title = await popup.title();
  assert.match(title, /Framefold/);
  console.log(`ok   popup renders: ${title}`);

  const controls = await popup.evaluate(() => ({
    enabled: !!document.querySelector('#enabled'),
    swatches: document.querySelectorAll('#bg button').length,
    intensity: !!document.querySelector('#intensity'),
  }));
  assert.deepEqual(controls, { enabled: true, swatches: 6, intensity: true });
  console.log('ok   popup controls present');
} finally {
  await ctx.close();
}
