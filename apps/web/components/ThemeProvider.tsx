'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeMode } from '@perakita/shared';

const ThemeContext = createContext<{
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolved: 'light' | 'dark';
} | null>(null);

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  const next = resolveMode(mode);
  document.documentElement.classList.toggle('dark', next === 'dark');
  document.documentElement.style.colorScheme = next;
  return next;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('perakita-theme');
    const nextMode =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setMode(nextMode);
    setResolved(applyTheme(nextMode));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setResolved(applyTheme(mode));
    localStorage.setItem('perakita-theme', mode);
  }, [mode, ready]);

  useEffect(() => {
    if (!ready || mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(applyTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode, ready]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useWebTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useWebTheme must be used within ThemeProvider');
  return ctx;
}
