'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { BudgetProgressBars } from '@/components/charts/BudgetProgressBars';
import { SpendingDonut } from '@/components/charts/SpendingDonut';
import { TrendBarChart } from '@/components/charts/TrendBarChart';
import { useAuth } from '@/spa/AuthProvider';
import { loadStatsDashboard, type WebStatsDashboard } from '@/lib/finance';

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'income' | 'expense' | 'neutral';
}) {
  const toneClass =
    tone === 'income'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'expense'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-[var(--foreground)]';

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card dark:shadow-card-dark">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WebStatsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadStatsDashboard(user.id)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const fmt = formatCurrency;

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-[var(--muted)]">
              {stats?.monthLabel ?? 'This month'} · charts and summaries
            </p>
          </div>
          <Link
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-950"
            to="/manage"
          >
            Manage finances
          </Link>
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <p className="mt-8 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        ) : stats ? (
          <div className="mt-8 space-y-6">
            {stats.dueToday.items.length > 0 ? (
              <section
                className={`rounded-[20px] border p-4 sm:p-5 ${
                  stats.dueToday.items.some(
                    (item) => item.reason === 'overdue' || item.reason === 'maturity'
                  )
                    ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40'
                    : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      Due today
                    </p>
                    <h2 className="mt-1 text-lg font-bold">
                      {stats.dueToday.items.length === 1
                        ? '1 loan needs attention'
                        : `${stats.dueToday.items.length} loans need attention`}
                    </h2>
                  </div>
                  <Link
                    className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white dark:text-slate-950"
                    to="/manage"
                  >
                    Open loans
                  </Link>
                </div>
                <ul className="mt-4 space-y-2">
                  {stats.dueToday.items.slice(0, 5).map((item) => (
                    <li
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)]/70 px-3 py-2 text-sm"
                      key={item.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.person_name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {item.label}
                          {item.loan_type === 'debt' ? ' · you owe' : ' · owed to you'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-bold ${
                          item.loan_type === 'debt'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {fmt(item.remaining_amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                hint="Income minus expenses only"
                label="Current balance"
                value={fmt(stats.balance)}
              />
              <StatCard label="Income" tone="income" value={fmt(stats.income)} />
              <StatCard label="Expenses" tone="expense" value={fmt(stats.expenses)} />
              <StatCard
                label="Net this month"
                tone={stats.net >= 0 ? 'income' : 'expense'}
                value={`${stats.net >= 0 ? '+' : ''}${fmt(stats.net)}`}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card dark:shadow-card-dark sm:p-6">
                <h2 className="text-lg font-bold">14-day cash flow</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Daily income vs expenses</p>
                <div className="mt-6">
                  {stats.dailyTrend.some((point) => point.income > 0 || point.expense > 0) ? (
                    <TrendBarChart points={stats.dailyTrend} />
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No transactions in the last 14 days.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card dark:shadow-card-dark sm:p-6">
                <h2 className="text-lg font-bold">Spending by category</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{stats.monthLabel}</p>
                {stats.spending.length === 0 ? (
                  <p className="mt-6 text-sm text-[var(--muted)]">Add expenses to see a breakdown.</p>
                ) : (
                  <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                    <SpendingDonut slices={stats.spending} />
                    <ul className="w-full space-y-2">
                      {stats.spending.map((item) => (
                        <li className="flex items-center gap-2 text-sm" key={item.name}>
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="flex-1 truncate font-medium">{item.name}</span>
                          <span className="text-[var(--muted)]">
                            {item.percent}% · {formatCurrency(item.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card dark:shadow-card-dark sm:p-6">
                <h2 className="text-lg font-bold">Budget progress</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">How much of each budget is used</p>
                <div className="mt-6">
                  <BudgetProgressBars budgets={stats.budgets} />
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card dark:shadow-card-dark sm:p-6">
                <h2 className="text-lg font-bold">Loans overview</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Debts and receivables tracked separately</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <StatCard label="You owe" tone="expense" value={fmt(stats.loanDebts)} />
                  <StatCard label="Owed to you" tone="income" value={fmt(stats.loanReceivables)} />
                  <StatCard
                    hint="Excluding cancelled"
                    label="Active loans"
                    value={String(stats.activeLoans)}
                  />
                  <StatCard label="Transactions" value={String(stats.transactionCount)} />
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
