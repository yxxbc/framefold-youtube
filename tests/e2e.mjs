/**
 * Live end-to-end check against youtube.com with the built extension loaded.
 * It asserts on the real DOM (not a fixture), so selectors drifting on YouTube fail here.
 *
 *   npm run build && npm run test:e2e
 *
 * Needs a GUI session: Chromium only loads unpacked extensions in headed mode.
 * On networks where youtube.com needs a proxy: MARGIN_PROXY=http://127.0.0.1:7890 npm run test:e2e
 * Screenshots of every stage land in /tmp/margin-yt-*.png.
 */
import { launchWithExtension } from './harness.mjs';

const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

const { ctx, popup } = await launchWithExtension();
check('popup loads', (await popup.title()).includes('Framefold'));
check('popup has switches', (await popup.locator('#enabled').count()) === 1 && (await popup.locator('#bg button').count()) === 6);

const page = ctx.pages().find((p) => p !== popup) ?? (await ctx.newPage());
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

async function setSettings(patch) {
  const base = { enabled: true, theme: 'auto', glass: true, bg: 'mesh', intensity: 0.55 };
  await popup.evaluate((s) => chrome.storage.sync.set({ settings: s }), { ...base, ...patch });
}

async function goto(url, waitForSkin = true) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  if (waitForSkin) await page.waitForFunction(() => !!document.getElementById('margin-skin'), null, { timeout: 30_000 });
  else await page.waitForTimeout(2500);
  await page.waitForTimeout(2500);
}

const read = (fn) => page.evaluate(fn);

async function checkNavigation(name, selected = null) {
  const state = await page.evaluate(() => {
    const toolbar = document.querySelector('ytd-masthead #mujian-shortcuts');
    const manager = document.querySelector('ytd-app > #content > #page-manager')?.getBoundingClientRect();
    const guide = document.querySelector('ytd-app > #content > #guide #guide-wrapper');
    return {
      links: toolbar?.querySelectorAll('a').length ?? 0,
      current: toolbar?.querySelector('a[aria-current="page"]')?.getAttribute('href') ?? null,
      fullWidth: Boolean(manager && manager.left < 2 && manager.width >= innerWidth - 2),
      guideHidden: Boolean(guide && (getComputedStyle(guide).visibility === 'hidden' || guide.getBoundingClientRect().right <= 0)),
    };
  });
  check(`${name}: shared navigation replaces the permanent rail`,
    state.links === 4 && state.current === selected && state.fullWidth && state.guideHidden, JSON.stringify(state));
}

await setSettings({ theme: 'light' });
await goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await checkNavigation('watch');
check('light: skin injected', await read(() => document.getElementById('margin-skin').textContent.length > 5000));
check('light: theme applied', (await read(() => document.documentElement.dataset.mTheme)) === 'light');
check('light: page detected', (await read(() => document.documentElement.dataset.mPage)) === 'watch');
check(
  'light: masthead grows',
  (await read(() => document.querySelector('ytd-masthead').getBoundingClientRect().height)) === 72,
);
check(
  // Signed out, the only avatar is the miniature player's close button. It still has to be
  // laid out, or the player sits empty on the page until a video is played.
  'light: mini player close button laid out',
  await read(() => {
    const btn = document.querySelector('ytd-miniplayer #avatar-btn');
    return !btn || btn.getBoundingClientRect().width > 0;
  }),
);
check(
  'light: search is a pill',
  (await read(() => getComputedStyle(document.querySelector('yt-searchbox .ytSearchboxComponentInputContainer')).borderRadius)) === '999px',
);
const watch = await read(() => {
  const title = document.querySelector('ytd-watch-metadata h1 yt-formatted-string');
  const t = getComputedStyle(title);
  return { titleColor: t.color, titleFont: t.fontFamily, canvas: document.querySelector('#margin-bg canvas')?.width ?? 0 };
});
check('light: metadata title uses the light theme ink', watch.titleColor === 'rgb(23, 24, 26)', watch.titleColor);
check('light: title uses serif', /Iowan|Palatino|Songti|Georgia/.test(watch.titleFont), watch.titleFont);
check('light: shader paints', watch.canvas > 0, `canvas width ${watch.canvas}`);
check(
  'no horizontal overflow',
  await read(() => document.documentElement.scrollWidth <= innerWidth + 1),
);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: '/tmp/margin-yt-watch-light.png' });
check(
  'watch: player spans both columns above metadata and recommendations',
  await read(() => {
    const player = document.querySelector('#movie_player').getBoundingClientRect();
    const watch = document.querySelector('ytd-watch-flexy');
    const metadata = watch.querySelector('ytd-watch-metadata').getBoundingClientRect();
    const related = watch.querySelector('#secondary #related').getBoundingClientRect();
    return player.width >= innerWidth * 0.9 && player.width >= metadata.width + related.width &&
      player.bottom <= Math.min(metadata.top, related.top) &&
      metadata.right < related.left &&
      Math.abs(metadata.top - related.top) < 30 &&
      Math.abs(player.right - related.right) < 2;
  }),
);
await setSettings({ theme: 'dark' });
await page.waitForTimeout(1200);
const dark = await read(() => {
  const lum = (c) => {
    const [r, g, b] = c.match(/\d+(\.\d+)?/g).map(Number);
    return (r + g + b) / 3;
  };
  return {
    attr: document.documentElement.hasAttribute('dark'),
    masthead: lum(getComputedStyle(document.querySelector('ytd-masthead')).backgroundColor),
    page: lum(getComputedStyle(document.documentElement).backgroundColor),
    title: lum(getComputedStyle(document.querySelector('ytd-watch-metadata h1 yt-formatted-string')).color),
  };
});
check('dark: native flag follows', dark.attr);
check('dark: masthead dark', dark.masthead < 80, String(dark.masthead));
check('dark: page background dark', dark.page < 80, String(dark.page));
check('dark: title light', dark.title > 180, String(dark.title));
await page.screenshot({ path: '/tmp/margin-yt-watch-dark.png' });

await setSettings({ theme: 'dark', glass: false });
await page.waitForFunction(() => document.documentElement.dataset.mGlass === 'off');
check(
  'live: glass toggle removes search box blur',
  await read(() => getComputedStyle(document.querySelector('yt-searchbox .ytSearchboxComponentInputContainer')).backdropFilter === 'none'),
);

await setSettings({ theme: 'light' });
await goto('https://www.youtube.com/results?search_query=lofi');
await checkNavigation('search');
const search = await read(() => {
  const chip = document.querySelector('ytd-search yt-chip-cloud-chip-renderer[aria-selected="true"], ytd-search yt-chip-cloud-chip-renderer.iron-selected');
  return {
    rows: document.querySelectorAll('ytd-video-renderer').length,
    hasSelectedFilter: Boolean(chip?.getBoundingClientRect().width),
  };
});
check('search: results and the selected filter are visible', search.rows > 0 && search.hasSelectedFilter, JSON.stringify(search));
check(
  'search: desktop puts video covers side by side with text below',
  await read(() => {
    const pairs = document.querySelectorAll('ytd-search ytd-item-section-renderer > #contents > ytd-video-renderer:has(+ ytd-video-renderer)');
    return [...pairs].some((first) => {
      const thumb = first.querySelector('#dismissible > :first-child')?.getBoundingClientRect();
      const text = first.querySelector('.text-wrapper')?.getBoundingClientRect();
      const a = first.getBoundingClientRect();
      const b = first.nextElementSibling.getBoundingClientRect();
      return thumb && text && Math.abs(a.top - b.top) < 2 && a.right < b.left && thumb.bottom <= text.top;
    });
  }),
);
await page.screenshot({ path: '/tmp/margin-yt-search.png' });
await page.setViewportSize({ width: 640, height: 900 });
await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
const narrowSearch = await read(() => {
  const sections = [...document.querySelectorAll('ytd-search ytd-item-section-renderer > #contents')]
    .filter((section) => section.offsetWidth > 0 && section.querySelector(':scope > ytd-video-renderer'));
  return { tracks: sections.map((section) => getComputedStyle(section).gridTemplateColumns), width: document.documentElement.scrollWidth };
});
check(
  'search: narrow viewport uses one column without horizontal overflow',
  narrowSearch.tracks.length > 0 && narrowSearch.tracks.every((track) => /^\d+(\.\d+)?px$/.test(track)) && narrowSearch.width <= 641,
  JSON.stringify(narrowSearch),
);
await page.setViewportSize({ width: 1440, height: 900 });

await goto('https://www.youtube.com/@RickAstleyYT/videos');
await checkNavigation('channel');
check(
  'channel: grid present',
  await read(() => document.querySelectorAll('ytd-rich-item-renderer').length > 0),
);

// Live settings change without a reload.
await goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await setSettings({ bg: 'off', theme: 'dark' });
await page.waitForTimeout(700);
check(
  'live: background turns off',
  // Assert on the rendered result, not on the `hidden` attribute we set ourselves.
  await read(() => getComputedStyle(document.getElementById('margin-bg')).display === 'none'),
);
await setSettings({ bg: 'mesh', theme: 'dark' });
await page.waitForFunction(() => document.getElementById('margin-bg')?.hidden === false);
check(
  'live: background canvas recovers after switching back on',
  await read(() => (document.querySelector('#margin-bg canvas')?.width ?? 0) > 0),
);
await page.locator('.ytp-size-button').click({ force: true });
await page.waitForFunction(() => document.querySelector('ytd-watch-flexy').hasAttribute('theater'));
check(
  'watch: theater keeps its native layout',
  await read(() => getComputedStyle(document.querySelector('ytd-watch-flexy #columns')).display !== 'grid'),
);

await setSettings({ enabled: false, theme: 'light' });
await page.waitForFunction(() => !document.getElementById('margin-skin'));
check(
  'disabled: background layer stays hidden without the skin stylesheet',
  await read(() => getComputedStyle(document.getElementById('margin-bg')).display === 'none'),
);
const nativeThemeChanges = await read(async () => {
  const root = document.documentElement;
  root.toggleAttribute('dark', true);
  await new Promise(requestAnimationFrame);
  return root.hasAttribute('dark');
});
check('disabled: YouTube can still change its own theme', nativeThemeChanges);

await setSettings({ theme: 'light' });
await goto('https://www.youtube.com/');
const guideButton = page.locator('ytd-masthead #guide-button button');
await page.locator('#mujian-shortcuts').waitFor();
check(
  'home: native logo, search, and shortcuts share one compact toolbar',
  await read(() => {
    const masthead = document.querySelector('ytd-masthead');
    const logo = masthead.querySelector('ytd-topbar-logo-renderer').getBoundingClientRect();
    const search = masthead.querySelector('yt-searchbox').getBoundingClientRect();
    const shortcuts = masthead.querySelector('#mujian-shortcuts').getBoundingClientRect();
    const account = masthead.querySelector('#end #buttons').getBoundingClientRect();
    const toolbar = masthead.getBoundingClientRect();
    return toolbar.height === 72 && logo.width > 0 && logo.right < search.left &&
      search.height > 0 && search.top >= toolbar.top && search.bottom <= toolbar.bottom &&
      shortcuts.left > search.right && shortcuts.right <= account.left;
  }),
);
check(
  'home: voice search has one button surface and clears the search field',
  await read(() => {
    const voice = document.querySelector('ytd-masthead #voice-search-button');
    const button = voice.querySelector('button');
    const search = document.querySelector('yt-searchbox .ytSearchboxComponentInputContainer').getBoundingClientRect();
    const bounds = button.getBoundingClientRect();
    return getComputedStyle(voice).backgroundColor === 'rgba(0, 0, 0, 0)' &&
      getComputedStyle(voice).boxShadow === 'none' && getComputedStyle(button).boxShadow === 'none' &&
      bounds.width > 0 && bounds.left >= search.right + 8 && Math.abs(bounds.top + bounds.height / 2 - (search.top + search.height / 2)) < 4;
  }),
);
check(
  'home: scroll keeps search in a 72px header with no blank second row',
  await read(async () => {
    const body = document.body;
    const previous = body.style.minHeight;
    body.style.minHeight = '200vh';
    window.scrollTo({ top: 260, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    const masthead = document.querySelector('ytd-masthead').getBoundingClientRect();
    const scrolled = scrollY > 100;
    window.scrollTo({ top: 0, behavior: 'instant' });
    body.style.minHeight = previous;
    return scrolled && Math.abs(masthead.top) < 2 && masthead.height === 72;
  }),
);
check(
  'home: feed uses the full page and keeps the native guide hidden initially',
  await read(() => {
    const manager = document.querySelector('ytd-app > #content > #page-manager').getBoundingClientRect();
    const wrapper = document.querySelector('ytd-app > #content > #guide #guide-wrapper');
    return manager.left < 2 && manager.width >= innerWidth - 2 &&
      (getComputedStyle(wrapper).visibility === 'hidden' || wrapper.getBoundingClientRect().right <= 0);
  }),
);
check(
  'home: feed uses equal columns at 1440px and shelves span them',
  await read(() => {
    const feed = document.querySelector('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer > #contents');
    if (!feed) return false;
    const shelf = feed.querySelector(':scope > ytd-rich-section-renderer');
    const layout = getComputedStyle(feed);
    const columns = layout.gridTemplateColumns.split(' ').map(parseFloat);
    if (columns.length !== 6 || Math.max(...columns) - Math.min(...columns) > 1) return false;
    if (CSS.supports('reading-flow', 'grid-rows') && (!layout.gridAutoFlow.includes('dense') || layout.readingFlow !== 'grid-rows')) return false;
    if (shelf && getComputedStyle(shelf).gridColumn !== '1 / -1') return false;
    const cards = [...feed.querySelectorAll(':scope > ytd-rich-item-renderer')].map((card) => card.getBoundingClientRect().width).filter((width) => width > 0);
    return cards.every((width) => Math.abs(width - columns[0]) < 2);
  }),
);
check(
  'home: category rail shares the feed gutter',
  await read(() => {
    const strip = document.querySelector('ytd-browse[page-subtype="home"] ytd-feed-filter-chip-bar-renderer #chips-wrapper');
    const feed = document.querySelector('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer > #contents');
    if (!strip || !feed) return true;
    const inset = parseFloat(getComputedStyle(strip).paddingLeft);
    return Math.abs(strip.getBoundingClientRect().left + inset - feed.getBoundingClientRect().left) < 2;
  }),
);
await page.screenshot({ path: '/tmp/mujian-yt-home.png' });
await guideButton.click();
await page.waitForFunction(() => {
  const wrapper = document.querySelector('ytd-app > #content > #guide #guide-wrapper');
  return wrapper?.getBoundingClientRect().left >= 0 && getComputedStyle(wrapper).visibility === 'visible';
});
check('home: native menu opens on click', await read(() => !document.documentElement.hasAttribute('data-m-guide-hidden')));
await guideButton.click();
await page.waitForFunction(() => !document.querySelector('ytd-app > #content > #guide').hasAttribute('opened'));

await page.setViewportSize({ width: 760, height: 900 });
await page.waitForFunction(() => !document.getElementById('mujian-shortcuts'));
check(
  'home: narrow window keeps the compact native toolbar',
  await read(() => document.querySelector('ytd-masthead').getBoundingClientRect().height === 72 &&
    document.documentElement.scrollWidth <= innerWidth + 1),
);
await page.setViewportSize({ width: 1440, height: 900 });
await page.locator('#mujian-shortcuts').waitFor();
const homeSearch = page.locator('ytd-masthead input[name="search_query"]');
await homeSearch.fill('lofi');
await homeSearch.press('Enter');
await page.waitForURL('**/results?**');
await page.waitForFunction(() => document.documentElement.dataset.mPage === 'search');
await checkNavigation('home to search');

await page.locator('#mujian-shortcuts a[href="/feed/history"]').click();
await page.waitForURL('**/feed/history');
await page.waitForFunction(() => document.querySelector('#mujian-shortcuts a[aria-current="page"]')?.getAttribute('href') === '/feed/history');
await checkNavigation('history', '/feed/history');
await page.locator('#mujian-shortcuts a[href="/feed/you"]').click();
await page.waitForURL('**/feed/you');
await page.waitForFunction(() => document.querySelector('#mujian-shortcuts a[aria-current="page"]')?.getAttribute('href') === '/feed/you');
await checkNavigation('you', '/feed/you');

await goto('https://www.youtube.com/shorts/YJbUv8BIZRY');
await page.locator('ytd-shorts #shorts-player').first().waitFor();
check(
  'shorts: full-width player page opens with the guide closed and Shorts selected',
  await read(() => {
    const manager = document.querySelector('ytd-app > #content > #page-manager').getBoundingClientRect();
    const guide = document.querySelector('ytd-app > #content > #guide #guide-wrapper');
    return document.documentElement.dataset.mPage === 'shorts' && manager.left < 2 &&
      manager.width >= innerWidth - 2 &&
      (getComputedStyle(guide).visibility === 'hidden' || guide.getBoundingClientRect().right <= 0) &&
      document.querySelector('#mujian-shortcuts a[aria-current="page"]')?.getAttribute('href')?.startsWith('/shorts');
  }),
);
check(
  'shorts: extracted creator details stay beside the player',
  await read(() => {
    const shorts = document.querySelector('ytd-shorts');
    const player = shorts?.querySelector('#shorts-player');
    const panel = player?.closest('#reel-overlay-container')
      ?.querySelector('.ytReelPlayerOverlayViewModelMetadataContainerMetapanel');
    if (!panel) return true;
    const a = player.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    return b.width > 0 && b.width <= 321 && b.right <= a.left && a.left - b.right <= 48;
  }),
);
await page.screenshot({ path: '/tmp/mujian-yt-shorts.png' });
await guideButton.click();
await page.waitForFunction(() => {
  const guide = document.querySelector('ytd-app > #content > #guide #guide-wrapper');
  return guide?.getBoundingClientRect().left >= 0 && getComputedStyle(guide).visibility === 'visible';
});
check('shorts: guide opens over the page', await read(() =>
  document.querySelector('ytd-app > #content > #page-manager').getBoundingClientRect().left < 2,
));

// ?margin=off must fall back to YouTube untouched.
await setSettings({ enabled: true, theme: 'light', bg: 'mesh' });
await goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ&margin=off', false);
check('off: style removed', await read(() => !document.getElementById('margin-skin')));
check('off: shared shortcuts and drawer styles are removed', await read(() =>
  !document.getElementById('mujian-shortcuts') && !document.documentElement.hasAttribute('data-m-navigation'),
));
check('off: native YouTube logo is visible', await read(() => document.querySelector('ytd-masthead ytd-topbar-logo-renderer').getBoundingClientRect().width > 0));
check(
  'off: original masthead height',
  await read(() => Math.round(document.querySelector('ytd-masthead').getBoundingClientRect().height)) === 56,
);

check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

await ctx.close();
if (failures.length) {
  console.error(`\n${failures.length} failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nall checks passed');
