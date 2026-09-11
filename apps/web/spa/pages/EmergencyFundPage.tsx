'use client';

import { useCallback, useEffect, useState } from 'react';
import { emergencyFundSchema, formatCurrency } from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/spa/AuthProvider';
import { loadWebEmergencyFund, upsertWebEmergencyFund } from '@/lib/savings';

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

function formatInput(value: number): string {
  return value > 0 ? String(Math.round(value * 100) / 100) : '';
}

export function EmergencyFundPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadWebEmergencyFund>> | null>(null);
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const next = await loadWebEmergencyFund(user.id);
      setData(next);
      setTarget(formatInput(next.fund?.target_amount ?? next.summary.recommendedTarget));
      setCurrent(formatInput(next.fund?.current_amount ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load emergency fund');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async () => {
    if (!user?.id || !data) return;
    setError(null);
    const parsed = emergencyFundSchema.safeParse({
      target_amount: parseAmount(target),
      current_amount: parseAmount(current) || 0,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check emergency fund details');
      return;
    }
    setSaving(true);
    try {
      await upsertWebEmergencyFund(user.id, {
        ...parsed.data,
        recommended_target: data.summary.recommendedTarget,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save emergency fund');
    } finally {
      setSaving(false);
    }
  };

  const summary = data?.summary;

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div>
          <h1 className="text-2xl font-extrabold">Emergency Fund</h1>
          <p className="mt-1 text-[var(--muted)]">Build a dedicated safety net without changing wallet balances.</p>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-[var(--muted)]">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <div>
                <p className="text-sm font-semibold uppercase text-[var(--muted)]">Current safety net</p>
                <p className="mt-2 text-4xl font-extrabold">{formatCurrency(summary?.currentAmount ?? 0)}</p>
                <p className="mt-1 text-[var(--muted)]">
                  of {formatCurrency(summary?.targetAmount ?? 0)} target
                </p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${Math.min(100, summary?.progressPercentage ?? 0)}%` }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-[var(--muted)]">Progress</p>
                  <p className="text-xl font-bold">{(summary?.progressPercentage ?? 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--muted)]">Remaining</p>
                  <p className="text-xl font-bold">{formatCurrency(summary?.remainingAmount ?? 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--muted)]">Months covered</p>
                  <p className="text-xl font-bold">{(summary?.monthsCovered ?? 0).toFixed(1)}</p>
                </div>
              </div>
              <div className="rounded-lg bg-[var(--surface-elevated)] p-4">
                <p className="text-sm text-[var(--muted)]">Recommended target</p>
                <p className="text-xl font-bold">{formatCurrency(summary?.recommendedTarget ?? 0)}</p>
              </div>
            </section>

            <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <h2 className="font-bold">Update fund</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  inputMode="decimal"
                  placeholder="Target amount"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  inputMode="decimal"
                  placeholder="Current saved"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
                <button
                  className="w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60 dark:text-slate-950"
                  disabled={saving}
                  onClick={() => void submit()}
                  type="button"
                >
                  Save emergency fund
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
