import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('aspire-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') return saved;
      // Default to dark mode as the signature style
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('aspire-theme', theme);
    } catch {
      // Ignored
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((curr) => (curr === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, setTheme };
}
