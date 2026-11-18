import {
  DEFAULT_SETTINGS,
  SHADER_IDS,
  SHADER_NAMES,
  loadSettings,
  saveSettings,
  type Settings,
  type ShaderId,
  type Theme,
} from '../shared/settings';

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

let settings: Settings = { ...DEFAULT_SETTINGS };

function render(): void {
  document.documentElement.dataset.theme = settings.theme;
  document.body.dataset.disabled = String(!settings.enabled);

  $<HTMLInputElement>('#enabled').checked = settings.enabled;
  $<HTMLInputElement>('#glass').checked = settings.glass;
  const range = $<HTMLInputElement>('#intensity');
  range.value = String(Math.round(settings.intensity * 100));
  range.disabled = settings.bg === 'off';

  for (const btn of document.querySelectorAll<HTMLButtonElement>('#theme button')) {
    btn.setAttribute('aria-checked', String(btn.dataset.theme === settings.theme));
    btn.tabIndex = btn.dataset.theme === settings.theme ? 0 : -1;
  }
  for (const btn of document.querySelectorAll<HTMLButtonElement>('#bg button')) {
    btn.setAttribute('aria-checked', String(btn.dataset.shader === settings.bg));
    btn.tabIndex = btn.dataset.shader === settings.bg ? 0 : -1;
  }
}

function commit(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
  render();
  void saveSettings(settings);
}

function buildSwatches(): void {
  const box = $('#bg');
  const entries: Array<[ShaderId | 'off', string]> = [
    ['off', '无'],
    ...SHADER_IDS.map((id) => [id, SHADER_NAMES[id]] as [ShaderId, string]),
  ];
  for (const [id, label] of entries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.shader = id;
    btn.setAttribute('role', 'radio');
    btn.innerHTML = `<span>${label}</span>`;
    btn.addEventListener('click', () => commit({ bg: id }));
    box.append(btn);
  }
}

function bind(): void {
  buildSwatches();

  $('#enabled').addEventListener('change', (e) => commit({ enabled: (e.target as HTMLInputElement).checked }));
  $('#glass').addEventListener('change', (e) => commit({ glass: (e.target as HTMLInputElement).checked }));

  for (const btn of document.querySelectorAll<HTMLButtonElement>('#theme button')) {
    btn.addEventListener('click', () => commit({ theme: btn.dataset.theme as Theme }));
  }

  let timer = 0;
  $('#intensity').addEventListener('input', (e) => {
    const value = Number((e.target as HTMLInputElement).value) / 100;
    settings = { ...settings, intensity: value };
    clearTimeout(timer);
    timer = window.setTimeout(() => void saveSettings(settings), 200);
  });

  // Keyboard: arrow keys move within each radio group.
  for (const group of document.querySelectorAll<HTMLElement>('[role="radiogroup"]')) {
    group.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const buttons = [...group.querySelectorAll<HTMLButtonElement>('button')];
      const index = buttons.findIndex((b) => b === document.activeElement);
      if (index < 0) return;
      e.preventDefault();
      const next = buttons[(index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]!;
      next.focus();
      next.click();
    });
  }
}

void loadSettings().then((s) => {
  settings = s;
  bind();
  render();
});
