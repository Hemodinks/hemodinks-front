import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '../../appTypes';

const THEME_KEY = 'hemodinks.theme';

function loadStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
    return;
  }

  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = 'light';
}

export function useThemePreference() {
  const [theme, setTheme] = useState<Theme>(() => loadStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === 'light' ? 'dark' : 'light');
  }, []);

  return {
    theme,
    toggleTheme,
  };
}
