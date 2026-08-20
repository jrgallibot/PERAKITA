'use client';

import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggleFab } from '@/components/ThemeToggleFab';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ThemeToggleFab />
    </ThemeProvider>
  );
}
