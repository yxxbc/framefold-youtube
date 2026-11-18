/**
 * Boots Chromium with the built extension loaded and returns the context plus a ready
 * popup page. Shared by the e2e run and the ad-hoc probe scripts.
 *
 * Needs a GUI session: Chromium only loads unpacked extensions in headed mode.
 * MARGIN_PROXY is threaded through for networks where youtube.com needs a proxy.
 */
import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveExtensionId } from './extension-id.mjs';

export async function launchWithExtension() {
  const ext = join(process.cwd(), 'dist');
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'margin-yt-')), {
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      ...(process.env.MARGIN_PROXY ? [`--proxy-server=${process.env.MARGIN_PROXY}`] : []),
    ],
  });
  const extensionId = await resolveExtensionId(ctx, ext);
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return { ctx, popup, ext, extensionId };
}
