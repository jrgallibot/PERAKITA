'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  computeGoalCalculations,
  computeGoalStatus,
  computeGoalsSummary,
  enrichSavingsGoal,
  formatCurrency,
  formatGoalStatusEmoji,
  goalStatusLabel,
  type SavingsGoal,
  type SavingsContribution,
} from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/spa/AuthProvider';
import { supabase } from '@/lib/supabase';

export function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [contributions, setContributions] = useState<SavingsContribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    void Promise.all([
      supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('target_date', { ascending: true }),
      supabase
        .from('savings_contributions')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null),
    ]).then(([goalsRes, contribRes]) => {
      setGoals((goalsRes.data as SavingsGoal[]) ?? []);
      setContributions((contribRes.data as SavingsContribution[]) ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  const summary = useMemo(() => computeGoalsSummary(goals, contributions), [goals, contributions]);

  const enriched = useMemo(() => {
    const byGoal: Record<string, SavingsContribution[]> = {};
    for (const c of contributions) {
      if (!byGoal[c.goal_id]) byGoal[c.goal_id] = [];
      byGoal[c.goal_id].push(c);
    }
    return goals.map((goal) => enrichSavingsGoal(goal, byGoal[goal.id] ?? [], []));
  }, [goals, contributions]);

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">My Savings Goals</h1>
        <p className="mt-1 text-[var(--muted)]">Track progress toward what matters to you</p>

        {loading ? (
          <p className="mt-6 text-[var(--muted)]">Loading…</p>
        ) : goals.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-lg font-semibold">🎯 What are you saving for?</p>
            <p className="mt-2 text-[var(--muted)]">
              Create a savings goal on mobile and it will sync here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[var(--muted)]">Total saved</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalSaved)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Total targets</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalTargets)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Overall progress</p>
                <p className="text-xl font-bold">{summary.overallProgress.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Monthly savings</p>
                <p className="text-xl font-bold">{formatCurrency(summary.monthlyContributions)}</p>
              </div>
            </div>

            <ul className="mt-6 space-y-4">
              {enriched.map(({ goal, calculations, status }) => {
                const pct = Math.round(calculations.progressPercentage);
                return (
                  <li key={goal.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{goal.name}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)} · {pct}%
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-xs font-semibold">
                        {formatGoalStatusEmoji(status)} {goalStatusLabel(status)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                      <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    {goal.target_date ? (
                      <p className="mt-3 text-sm text-primary">
                        Required {formatCurrency(Math.ceil(calculations.requiredDailySavings))}/day ·{' '}
                        {calculations.daysRemaining ?? 0} days left
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
