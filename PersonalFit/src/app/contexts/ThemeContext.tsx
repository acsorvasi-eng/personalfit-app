/**
 * ThemeContext - Sötét/Világos mód kezelés
 * Theme is persisted in IndexedDB via SettingsService.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSetting, setSetting } from '../backend/services/SettingsService';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'themeMode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    getSetting(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') setThemeState(saved);
      setThemeLoaded(true);
    });
  }, []);

  useEffect(() => {
    // Dark mode is disabled — ensure 'dark' class is never present on <html>
    document.documentElement.classList.remove('dark');
    if (themeLoaded) setSetting(STORAGE_KEY, theme).catch(() => {});
  }, [theme, themeLoaded]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: false, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const THEME_FALLBACK: ThemeContextType = {
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return THEME_FALLBACK;
  }
  return context;
}