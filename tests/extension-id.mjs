/**
 * Unpacked-extension ids for the tests.
 *
 * Chromium derives an unpacked extension's id from a SHA-256 of its absolute path when the
 * manifest carries no `key`. Rather than reimplement that, ask the browser: open the
 * extensions page and report where the extension installed from `ext` ended up. This also
 * proves the build actually loaded, which a hand-computed id would only assume.
 */
export async function resolveExtensionId(ctx, ext) {
  const page = await ctx.newPage();
  await page.goto('chrome://extensions');
  const id = await page.evaluate(async (dir) => {
    const items = await chrome.developerPrivate.getExtensionsInfo();
    const hit = items.find((e) => e.location === 'UNPACKED' && e.path === dir);
    return hit?.id ?? null;
  }, ext);
  await page.close();
  if (!id) throw new Error(`extension not loaded from ${ext}`);
  return id;
}
