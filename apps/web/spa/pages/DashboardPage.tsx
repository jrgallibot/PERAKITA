'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, PESO_AI_DISCLAIMER, buildPesoNotificationAlerts } from '@perakita/shared';
import type { PesoNotificationAlert } from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { NotificationAlertsBanner } from '@/components/NotificationAlertsBanner';
import { useAuth } from '@/spa/AuthProvider';
import { fetchNotificationPrefs } from '@/lib/notificationPrefs';
import {
  fetchWebAiInsight,
  isWebOnboardingComplete,
  loadWebBudgetRows,
  loadWebPesoDashboard,
  saveWebOnboarding,
} from '@/lib/peso';

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card dark:shadow-card-dark">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${tone ?? 'text-[var(--foreground)]'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [peso, setPeso] = useState<Awaited<ReturnType<typeof loadWebPesoDashboard>> | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<PesoNotificationAlert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    display_name: '',
    current_money: '10000',
    income_source: 'Salary',
    income_amount: '10000',
    next_payday: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      loadWebPesoDashboard(user.id),
      isWebOnboardingComplete(user.id),
      fetchNotificationPrefs(user.id),
      loadWebBudgetRows(user.id),
    ])
      .then(async ([data, onboarded, prefs, budgets]) => {
        if (cancelled) return;
        setPeso(data);
        if (!onboarded) setShowOnboarding(true);
        setAlerts(buildPesoNotificationAlerts(data, prefs, budgets));
        const ai = await fetchWebAiInsight(data);
        if (!cancelled) setInsight(ai);
      })
      .catch((err) => {
        console.error('Dashboard load failed', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => !dismissed.includes(alert.id)),
    [alerts, dismissed],
  );

  const fmt = formatCurrency;

  const submitOnboarding = async () => {
    if (!user?.id) return;
    await saveWebOnboarding(user.id, {
      display_name: onboardingForm.display_name,
      current_money: Number(onboardingForm.current_money),
      income_source: onboardingForm.income_source,
      income_amount: Number(onboardingForm.income_amount),
      income_frequency: 'monthly',
      next_payday: onboardingForm.next_payday,
    });
    setShowOnboarding(false);
    const data = await loadWebPesoDashboard(user.id);
    setPeso(data);
  };

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-[var(--muted)]">Know where your money goes before it runs out.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold" to="/assistant">
              AI assistant
            </Link>
            <Link className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold" to="/goals">
              Goals
            </Link>
            <Link className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-950" to="/manage">
              Manage finances
            </Link>
          </div>
        </div>

        <NotificationAlertsBanner
          alerts={visibleAlerts}
          onDismiss={(id) => setDismissed((prev) => [...prev, id])}
        />

        {showOnboarding ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
              <h2 className="text-lg font-bold">Complete your profile</h2>
              <div className="mt-4 space-y-3">
                {(['display_name', 'current_money', 'income_source', 'income_amount', 'next_payday'] as const).map(
                  (key) => (
                    <label key={key} className="block text-sm">
                      <span className="text-[var(--muted)]">{key.replace(/_/g, ' ')}</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                        value={onboardingForm[key]}
                        onChange={(e) => setOnboardingForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </label>
                  )
                )}
              </div>
              <button
                className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-white dark:text-slate-950"
                onClick={() => void submitOnboarding()}
                type="button"
              >
                Save and continue
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : peso ? (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Current balance" value={fmt(peso.currentBalance)} />
              <StatCard label="Real available" value={fmt(peso.realAvailable)} />
              <StatCard
                hint={`${peso.daysUntilPayday} days until payday`}
                label="Safe to spend today"
                tone="text-emerald-600 dark:text-emerald-400"
                value={fmt(peso.safeToSpendToday)}
              />
              <StatCard label="Financial health" value={`${peso.healthScore.score}/100`} />
            </div>

            {peso.spendingRisk.detected ? (
              <div className="rounded-2xl border border-amber-400/50 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">Spending Risk Detected</p>
                <p className="mt-1 text-sm">{peso.spendingRisk.message}</p>
                <Link className="mt-2 inline-block text-sm font-semibold text-primary" to="/assistant">
                  How can I fix this?
                </Link>
              </div>
            ) : null}

            {peso.forecast.warning ? (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-4 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {peso.forecast.warning}
              </div>
            ) : null}

            {insight ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">AI insight</p>
                <p className="mt-2">{insight}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{PESO_AI_DISCLAIMER}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
