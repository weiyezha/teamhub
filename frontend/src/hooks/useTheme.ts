import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
    return 'dark';
  });

  const applyTheme = useCallback((t: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    let effective: 'light' | 'dark';
    if (t === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effective = t;
    }

    // data-theme for new design system CSS variables
    root.setAttribute('data-theme', effective);

    // class-based dark mode for Tailwind dark: variants
    if (effective === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const listener = (e: MediaQueryListEvent) => {
        const root = document.documentElement;
        const effective = e.matches ? 'dark' : 'light';
        root.setAttribute('data-theme', effective);
        if (e.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      };
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
  }, [theme, applyTheme]);

  const setTheme = (t: 'light' | 'dark' | 'system') => setThemeState(t);
  const toggle = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));

  return { theme, setTheme, toggle };
}
