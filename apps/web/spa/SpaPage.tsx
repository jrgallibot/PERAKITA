'use client';

import { useEffect, useState, type ComponentType } from 'react';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/**
 * Mount the React Router SPA only in the browser.
 * Avoid next/dynamic — it calls useContext during static export and can crash
 * with "Cannot read properties of null (reading 'useContext')" in this monorepo.
 */
export function SpaPage() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('@/spa/App').then((mod) => {
      if (!cancelled) setApp(() => mod.SpaApp);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!App) return <Splash />;
  return <App />;
}
