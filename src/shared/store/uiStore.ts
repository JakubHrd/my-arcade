import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

type UIState = {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
};

const KEY = 'ui_theme_mode';

const initialMode = (() => {
  try {
    const saved = localStorage.getItem(KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;
    // preferuje systémové nastavení
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'light';
  }
})();

export const useUIStore = create<UIState>()((set, get) => ({
  themeMode: initialMode,
  setThemeMode: (m) => {
    try { localStorage.setItem(KEY, m); } catch {}
    set({ themeMode: m });
  },
  toggleTheme: () => {
    const next = get().themeMode === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch {}
    set({ themeMode: next });
  },
}));
