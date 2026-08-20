'use client';

import { APP_ABOUT, APP_CREDIT, APP_NAME, type ThemeMode } from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { useToast } from '@/components/Toast';
import { useWebTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/spa/AuthProvider';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { mode, setMode, resolved } = useWebTheme();
  const notify = useToast();

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-2 text-[var(--muted)]">Appearance, account, and app info.</p>

        <section className="mt-8 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Account</p>
          <p className="mt-2 text-base font-semibold">{user?.email}</p>
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Appearance</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Currently {resolved === 'dark' ? 'dark' : 'light'}
            {mode === 'system' ? ' (following your device)' : ''}.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => {
              const selected = mode === option.value;
              return (
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    selected
                      ? 'border-primary bg-primary text-white dark:text-slate-950'
                      : 'border-[var(--border)] text-[var(--foreground)]'
                  }`}
                  key={option.value}
                  onClick={() => {
                    setMode(option.value);
                    notify.info(`${option.label} theme applied`);
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            About {APP_NAME}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{APP_ABOUT}</p>
          <p className="mt-3 text-xs text-[var(--muted)]">{APP_CREDIT}</p>
        </section>

        <button
          className="mt-6 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
