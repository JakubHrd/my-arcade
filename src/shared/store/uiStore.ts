import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

interface UIState {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (m: ThemeMode) => void;
}

const getInitialMode = (): ThemeMode => {
  const saved = localStorage.getItem('themeMode') as ThemeMode | null;
  if (saved) return saved;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export const useUIStore = create<UIState>((set) => ({
  themeMode: getInitialMode(),
  toggleTheme: () =>
    set((s) => {
      const next: ThemeMode = s.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return { themeMode: next };
    }),
  setTheme: (m) => {
    localStorage.setItem('themeMode', m);
    set({ themeMode: m });
  },
}));
