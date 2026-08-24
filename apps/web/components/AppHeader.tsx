'use client';

import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '@perakita/shared';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/spa/AuthProvider';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const onSettings = location.pathname === '/settings';
  const onManage = location.pathname === '/manage';
  const onDashboard = location.pathname === '/dashboard';
  const onReports = location.pathname === '/reports';

  const navLinkClass = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-sm font-semibold sm:px-4 ${
      active
        ? 'border-primary bg-primary text-white dark:text-slate-950'
        : 'border-[var(--border)] text-[var(--foreground)]'
    }`;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link className="flex min-w-0 items-center gap-3" to="/dashboard">
          <BrandLogo size={40} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--foreground)]">{APP_NAME}</p>
            <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
          </div>
        </Link>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Link className={navLinkClass(onDashboard)} to="/dashboard">
            Dashboard
          </Link>
          <Link className={navLinkClass(onReports)} to="/reports">
            Reports
          </Link>
          <Link className={navLinkClass(onManage)} to="/manage">
            Manage
          </Link>
          {onSettings ? (
            <Link className={navLinkClass(false)} to="/dashboard">
              Back
            </Link>
          ) : (
            <Link className={navLinkClass(onSettings)} to="/settings">
              Settings
            </Link>
          )}
          <button
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] sm:px-4"
            onClick={() => void signOut()}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
