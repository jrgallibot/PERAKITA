'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type NoticeKind = 'success' | 'error' | 'info' | 'deleted';

type Notice = {
  id: number;
  kind: NoticeKind;
  title: string;
};

type ToastApi = {
  success: (title: string) => void;
  error: (title: string) => void;
  info: (title: string) => void;
  deleted: (title: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const KIND_STYLES: Record<NoticeKind, string> = {
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200',
  error: 'border-red-500/40 bg-red-50 text-red-800 dark:bg-red-950/70 dark:text-red-200',
  info: 'border-sky-500/40 bg-sky-50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200',
  deleted: 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200',
};

const KIND_LABEL: Record<NoticeKind, string> = {
  success: 'Saved',
  error: 'Error',
  info: 'Updated',
  deleted: 'Deleted',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);

  const push = useCallback((kind: NoticeKind, title: string) => {
    const id = Date.now() + Math.random();
    setNotices((current) => [...current.slice(-3), { id, kind, title }]);
    window.setTimeout(() => {
      setNotices((current) => current.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title) => push('success', title),
      error: (title) => push('error', title),
      info: (title) => push('info', title),
      deleted: (title) => push('deleted', title),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {notices.map((notice) => (
          <div
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg ${KIND_STYLES[notice.kind]}`}
            key={notice.id}
            role="status"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">
              {KIND_LABEL[notice.kind]}
            </p>
            <p className="mt-0.5">{notice.title}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
