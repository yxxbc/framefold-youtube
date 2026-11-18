import skin from './skin.css';
import { BackgroundLayer } from './bg';
import { setNavigationPath } from './navigation';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChange, type Settings } from '../shared/settings';

const root = document.documentElement;

const style = document.createElement('style');
style.id = 'margin-skin';
style.textContent = skin;

const bg = new BackgroundLayer();
/** YouTube rewrites unknown query params away shortly after load, so remember the URL
 *  we were opened with (and each SPA navigation's starting URL) before that happens. */
let entrySearch = location.search;
addEventListener('yt-navigate-start', () => (entrySearch = location.search));
let settings: Settings = DEFAULT_SETTINGS;
let skinOn = false;
/** YouTube's own theme state, remembered so turning the skin off restores it. */
let nativeDark = root.hasAttribute('dark');

const themeObserver = new MutationObserver(() => {
  nativeDark = root.hasAttribute('dark');
  const theme = syncTheme();
  if (root.dataset.mTheme === theme) return;
  root.dataset.mTheme = theme;
  if (skinOn) bg.apply(settings.bg, settings.intensity, theme);
});

/** An explicit light/dark choice also flips YouTube's own [dark] flag. Plenty of YouTube's
 *  newer components bake their colours in at render time instead of reading --yt-spec-*,
 *  so overriding tokens alone leaves dark text on dark cards. */
function syncTheme(): 'light' | 'dark' {
  const dark = skinOn && settings.theme !== 'auto' ? settings.theme === 'dark' : nativeDark;
  if (root.hasAttribute('dark') !== dark) {
    root.toggleAttribute('dark', dark);
    // The observer tracks YouTube's choice. Discard the record for our own write.
    themeObserver.takeRecords();
  }
  return dark ? 'dark' : 'light';
}

function forcedOff(): boolean {
  return [entrySearch, location.search].some((search) => new URLSearchParams(search).get('margin') === 'off');
}

function pageKind(): string {
  const p = location.pathname;
  if (p === '/watch') return 'watch';
  if (p === '/results') return 'search';
  if (p === '/shorts' || p.startsWith('/shorts/')) return 'shorts';
  if (p === '/') return 'home';
  if (p.startsWith('/feed/')) return 'feed';
  if (p.startsWith('/@') || p.startsWith('/channel/') || p.startsWith('/c/') || p.startsWith('/user/')) return 'channel';
  if (p.startsWith('/playlist')) return 'playlist';
  return 'other';
}

function apply(s: Settings): void {
  if (themeObserver.takeRecords().length) nativeDark = root.hasAttribute('dark');
  settings = s;
  const on = s.enabled && !forcedOff();
  const changed = on !== skinOn;
  skinOn = on;
  const theme = syncTheme();

  root.dataset.mTheme = theme;
  root.dataset.mGlass = s.glass ? 'on' : 'off';
  const page = pageKind();
  root.dataset.mPage = page;

  if (changed) {
    if (on) root.append(style);
    else style.remove();
  }

  setNavigationPath(on ? location.pathname : null);
  if (on) bg.apply(s.bg, s.intensity, theme);
  else bg.apply('off', 0, theme);
}

void loadSettings().then(apply);
onSettingsChange(apply);

themeObserver.observe(root, { attributes: true, attributeFilter: ['dark'] });
document.addEventListener('yt-navigate-finish', () => apply(settings));
addEventListener('popstate', () => apply(settings));
