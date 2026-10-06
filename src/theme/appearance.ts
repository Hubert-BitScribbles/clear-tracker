// Theme and high-contrast preference.
//
// Stored in localStorage so index.html can apply it before first paint.
// When the Dexie settings store arrives (step 2) this stays as a fast
// mirror of the saved setting; it is not the source of truth for anything
// else. Keep the storage key and logic in step with the script in index.html.

export type ThemePref = 'system' | 'light' | 'dark';
export type Appearance = { theme: ThemePref; highContrast: boolean };

const KEY = 'ct-appearance';
const DEFAULT: Appearance = { theme: 'system', highContrast: false };
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function loadAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved && typeof saved === 'object') return { ...DEFAULT, ...saved };
  } catch {
    // Storage unavailable or corrupt: fall back to defaults.
  }
  return DEFAULT;
}

export function saveAppearance(a: Appearance): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // Private mode or full storage: the choice still applies this session.
  }
}

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') return darkQuery().matches ? 'dark' : 'light';
  return pref;
}

export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  const theme = resolveTheme(a.theme);
  root.dataset.theme = theme;
  root.dataset.contrast = a.highContrast ? 'high' : 'normal';
  // Colours the browser/status bar to match the page background.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#14171C' : '#FAFAF9');
}

export function onSystemThemeChange(cb: () => void): () => void {
  const q = darkQuery();
  q.addEventListener('change', cb);
  return () => q.removeEventListener('change', cb);
}
