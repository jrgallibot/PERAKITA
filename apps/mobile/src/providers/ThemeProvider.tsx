import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  getResolvedScheme,
  getThemeColors,
  type ThemeColors,
  type ThemeMode,
} from '@perakita/shared';
import { useThemeStore } from '@/stores/themeStore';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = (useColorScheme() === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  const mode = useThemeStore((s) => s.mode);
  const scheme = getResolvedScheme(mode, systemScheme);

  const value = useMemo(
    () => ({
      colors: getThemeColors(mode, systemScheme),
      mode,
      scheme,
      isDark: scheme === 'dark',
    }),
    [mode, scheme, systemScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
