/** Settings shared by the content script and the popup. Kept deliberately small. */

export type Theme = 'auto' | 'light' | 'dark';
export type ShaderId = 'aurora' | 'silk' | 'mesh' | 'grain' | 'ice';

export const SHADER_IDS: readonly ShaderId[] = ['aurora', 'silk', 'mesh', 'grain', 'ice'];

export const SHADER_NAMES: Record<ShaderId, string> = {
  aurora: '极光',
  silk: '丝绸',
  mesh: '网格渐变',
  grain: '颗粒',
  ice: '冰蓝',
};

export interface Settings {
  enabled: boolean;
  theme: Theme;
  /** Liquid-glass (backdrop blur) on the search pill and chips. */
  glass: boolean;
  bg: ShaderId | 'off';
  /** 0–1 */
  intensity: number;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  theme: 'auto',
  glass: true,
  bg: 'mesh',
  intensity: 0.5,
};

const KEY = 'settings';

function isShader(v: unknown): v is ShaderId {
  return typeof v === 'string' && (SHADER_IDS as readonly string[]).includes(v);
}

/** Accepts anything from storage and returns a complete, in-range object. */
export function mergeSettings(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Settings>;
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : DEFAULT_SETTINGS.enabled,
    theme: r.theme === 'light' || r.theme === 'dark' || r.theme === 'auto' ? r.theme : DEFAULT_SETTINGS.theme,
    glass: typeof r.glass === 'boolean' ? r.glass : DEFAULT_SETTINGS.glass,
    bg: isShader(r.bg) || r.bg === 'off' ? r.bg : DEFAULT_SETTINGS.bg,
    intensity:
      typeof r.intensity === 'number' && Number.isFinite(r.intensity)
        ? Math.min(1, Math.max(0, r.intensity))
        : DEFAULT_SETTINGS.intensity,
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(KEY);
  return mergeSettings(stored[KEY]);
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: mergeSettings(s) });
}

export function onSettingsChange(fn: (s: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[KEY]) return;
    fn(mergeSettings(changes[KEY].newValue));
  });
}
