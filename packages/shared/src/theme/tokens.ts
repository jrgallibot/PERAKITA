export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryMuted: string;
  income: string;
  expense: string;
  warning: string;
  debt: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBackground: string;
  tabBar: string;
  tabBarBorder: string;
  gradientStart: string;
  gradientEnd: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  primary: '#0D9488',
  primaryMuted: '#CCFBF1',
  income: '#059669',
  expense: '#DC2626',
  warning: '#D97706',
  debt: '#F59E0B',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  inputBackground: '#F1F5F9',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  gradientStart: '#F0FDFA',
  gradientEnd: '#F8FAFC',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  primary: '#2DD4BF',
  primaryMuted: '#134E4A',
  income: '#34D399',
  expense: '#F87171',
  warning: '#FBBF24',
  debt: '#FCD34D',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  inputBackground: '#1E293B',
  tabBar: '#1E293B',
  tabBarBorder: '#334155',
  gradientStart: '#0F172A',
  gradientEnd: '#1E293B',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '600' as const, lineHeight: 40 },
  title: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  amount: { fontSize: 32, fontWeight: '600' as const, lineHeight: 38 },
  amountSmall: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export function getThemeColors(mode: ThemeMode, systemScheme: 'light' | 'dark'): ThemeColors {
  if (mode === 'system') {
    return systemScheme === 'dark' ? darkColors : lightColors;
  }
  return mode === 'dark' ? darkColors : lightColors;
}

export function getResolvedScheme(mode: ThemeMode, systemScheme: 'light' | 'dark'): 'light' | 'dark' {
  if (mode === 'system') return systemScheme;
  return mode;
}
