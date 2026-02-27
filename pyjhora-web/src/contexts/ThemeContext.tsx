import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeRaw] = useLocalStorage<Theme>('jhora-theme', 'dark');

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    // Add transitioning class for smooth colour shift
    root.classList.add('theme-transitioning');
    root.setAttribute('data-theme', t);

    // Remove class after transition completes
    const id = setTimeout(() => root.classList.remove('theme-transitioning'), 350);
    return () => clearTimeout(id);
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeRaw(t);
      applyTheme(t);
    },
    [setThemeRaw, applyTheme],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Sync attribute on mount (in case localStorage already has a value)
  // We do this eagerly so SSR-hydrated HTML never flickers.
  document.documentElement.setAttribute('data-theme', theme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
