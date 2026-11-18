const desktop = matchMedia('(min-width: 900px)');
const root = document.documentElement;
const shortcuts = document.createElement('nav');
shortcuts.id = 'mujian-shortcuts';

let activePath: string | null = null;
const observer = new MutationObserver(setup);
const openPersistentGuide = 'ytd-app > #content > #guide[persistent][opened]';

function guideLink(path: string): HTMLAnchorElement | null {
  return document.querySelector(`ytd-guide-renderer a[href="${path}"]`);
}

function setup(): void {
  const toolbar = document.querySelector('ytd-app ytd-masthead #end');
  if (!toolbar) return;
  observer.disconnect();
  root.setAttribute('data-m-navigation', '');

  const language = document.documentElement.lang.toLowerCase();
  const traditional = /^zh-(tw|hk|hant)/.test(language);
  const chinese = language.startsWith('zh');
  shortcuts.setAttribute('aria-label', chinese ? (traditional ? '快速導覽' : '快捷导航') : 'Quick navigation');

  const destinations = [
    ['/shorts/', 'Shorts'],
    ['/feed/subscriptions', chinese ? (traditional ? '訂閱' : '订阅') : 'Subscriptions'],
    ['/feed/history', chinese ? (traditional ? '觀看記錄' : '观看记录') : 'History'],
    ['/feed/you', chinese ? '我的' : 'You'],
  ] as const;
  for (const [path, fallback] of destinations) {
    const link = document.createElement('a');
    const native = guideLink(path);
    link.href = native?.getAttribute('href') || path;
    link.textContent = native?.getAttribute('title')?.trim() || fallback;
    if (path.replace(/\/$/, '') === activePath) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = guideLink(path);
      if (!destination) return;
      event.preventDefault();
      destination.click();
    });
    shortcuts.append(link);
  }
  toolbar.prepend(shortcuts);
}

function revealGuide(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('ytd-masthead #guide-button')) return;
  document.removeEventListener('click', revealGuide, true);
  root.removeAttribute('data-m-guide-hidden');
  // The native drawer can already be open. Reveal it before handling later clicks natively.
  if (!document.querySelector(openPersistentGuide)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function concealGuide(): void {
  root.setAttribute('data-m-guide-hidden', '');
  document.addEventListener('click', revealGuide, true);
}

function dismissGuide(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || root.hasAttribute('data-m-guide-hidden')) return;
  const guide = document.querySelector(openPersistentGuide);
  if (!guide?.contains(document.activeElement)) return;
  concealGuide();
  document.querySelector<HTMLElement>('ytd-masthead #guide-button button')?.focus();
  event.preventDefault();
  event.stopPropagation();
}

function update(): void {
  observer.disconnect();
  document.removeEventListener('click', revealGuide, true);
  document.removeEventListener('keydown', dismissGuide, true);
  root.removeAttribute('data-m-guide-hidden');
  root.removeAttribute('data-m-navigation');
  shortcuts.replaceChildren();
  shortcuts.remove();
  if (!activePath || !desktop.matches) return;
  concealGuide();
  document.addEventListener('keydown', dismissGuide, true);
  observer.observe(root, { subtree: true, childList: true });
  setup();
}

desktop.addEventListener('change', update);

export function setNavigationPath(path: string | null): void {
  if (path && /^\/(embed|live_chat|live_chat_replay)(\/|$)/.test(path)) path = null;
  if (path?.startsWith('/shorts/')) path = '/shorts';
  if (path && path !== '/') path = path.replace(/\/$/, '');
  if (activePath === path && (shortcuts.isConnected || !activePath || !desktop.matches)) return;
  activePath = path;
  update();
}
