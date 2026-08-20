'use client';

import { Link } from 'react-router-dom';
import { APP_ABOUT, APP_CREDIT, APP_NAME, APP_TAGLINE } from '@perakita/shared';
import { BrandLogo } from '@/components/BrandLogo';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-teal-800 via-teal-600 to-cyan-600 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative z-10">
          <Link className="mb-16 flex items-center gap-3" to="/">
            <BrandLogo size={48} />
            <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-100">
            Personal finance
          </p>
          <h2 className="mt-4 max-w-md text-4xl font-extrabold leading-tight">{APP_TAGLINE}</h2>
          <p className="mt-4 max-w-md text-base leading-7 text-teal-50/90">{APP_ABOUT}</p>
        </div>

        <div className="relative z-10 max-w-md space-y-3">
          {[
            'Works offline on your phone with SQLite',
            'Syncs to the cloud when you have internet',
            'Track income and expenses in PHP',
          ].map((item) => (
            <div
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-6 backdrop-blur-md"
              key={item}
            >
              {item}
            </div>
          ))}
          <p className="pt-4 text-sm text-teal-100">{APP_CREDIT}</p>
        </div>
      </aside>

      <main className="relative flex min-h-dvh items-start justify-center bg-[var(--background)] px-4 py-8 sm:items-center sm:px-6">
        <div className="w-full max-w-[440px] pt-10 sm:pt-0">
          <div className="mb-8 lg:hidden">
            <Link className="mb-4 flex items-center gap-3" to="/">
              <BrandLogo size={44} />
              <span className="text-xl font-bold">{APP_NAME}</span>
            </Link>
            <p className="text-sm text-[var(--muted)]">{APP_TAGLINE}</p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">{subtitle}</p>
          <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card dark:shadow-card-dark sm:mt-8 sm:rounded-[28px] sm:p-8">
            {children}
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-[var(--muted)] lg:hidden">
            {APP_CREDIT}
          </p>
        </div>
      </main>
    </div>
  );
}
