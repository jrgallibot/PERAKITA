import { create } from 'zustand';
import type { ThemeMode } from '@perakita/shared';

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  hydrate: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  hydrated: false,
  setMode: (mode) => set({ mode }),
  hydrate: (mode) => set({ mode, hydrated: true }),
}));
