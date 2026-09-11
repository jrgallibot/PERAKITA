'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SAVINGS_GOAL_CATEGORIES,
  enrichSavingsGoal,
  formatCurrency,
  formatGoalStatusEmoji,
  goalStatusLabel,
  savingsContributionSchema,
  savingsGoalSchema,
  todayIso,
  type SavingsGoalCategory,
  type SavingsGoalPriority,
} from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/spa/AuthProvider';
import {
  addWebSavingsContribution,
  createWebSavingsGoal,
  loadWebSavingsDashboard,
} from '@/lib/savings';

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

const PRIORITIES: SavingsGoalPriority[] = ['low', 'medium', 'high'];

export function GoalsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadWebSavingsDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState({
    category: 'other' as SavingsGoalCategory,
    name: '',
    target: '',
    current: '0',
    targetDate: '',
    priority: 'medium' as SavingsGoalPriority,
    description: '',
  });
  const [contributionForm, setContributionForm] = useState({
    goalId: '',
    amount: '',
    date: todayIso(),
    source: 'Salary',
    notes: '',
  });

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setData(await loadWebSavingsDashboard(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load savings');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enriched = useMemo(() => {
    if (!data) return [];
    return data.goals.map((goal) =>
      enrichSavingsGoal(goal, data.contributionsByGoal[goal.id] ?? [], data.milestonesByGoal[goal.id] ?? []),
    );
  }, [data]);

  const activeGoals = enriched.filter((item) => !item.goal.is_completed && !item.goal.is_archived);
  const completedGoals = enriched.filter((item) => item.goal.is_completed);
  const selectedCategory =
    SAVINGS_GOAL_CATEGORIES.find((item) => item.value === goalForm.category) ?? SAVINGS_GOAL_CATEGORIES[0];

  const submitGoal = async () => {
    if (!user?.id) return;
    setError(null);
    const parsed = savingsGoalSchema.safeParse({
      name: goalForm.name.trim() || selectedCategory.defaultName,
      category: goalForm.category,
      icon: selectedCategory.icon,
      target_amount: parseAmount(goalForm.target),
      current_amount: parseAmount(goalForm.current) || 0,
      target_date: goalForm.targetDate || null,
      priority: goalForm.priority,
      description: goalForm.description.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your goal details');
      return;
    }
    setSaving(true);
    try {
      await createWebSavingsGoal(user.id, parsed.data);
      setGoalForm({
        category: 'other',
        name: '',
        target: '',
        current: '0',
        targetDate: '',
        priority: 'medium',
        description: '',
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create savings goal');
    } finally {
      setSaving(false);
    }
  };

  const submitContribution = async () => {
    if (!user?.id) return;
    setError(null);
    const parsed = savingsContributionSchema.safeParse({
      goal_id: contributionForm.goalId,
      amount: parseAmount(contributionForm.amount),
      contribution_date: contributionForm.date,
      source: contributionForm.source.trim() || null,
      notes: contributionForm.notes.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check contribution details');
      return;
    }
    setSaving(true);
    try {
      await addWebSavingsContribution(user.id, parsed.data);
      setContributionForm((form) => ({ ...form, amount: '', notes: '' }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add savings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Savings</h1>
            <p className="mt-1 text-[var(--muted)]">Track savings goals and record progress without changing wallet balances.</p>
          </div>
          <a className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold" href="/emergency-fund">
            Emergency fund
          </a>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-[var(--muted)]">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-5">
              {data ? (
                <div className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm text-[var(--muted)]">Total saved</p>
                    <p className="text-xl font-bold">{formatCurrency(data.summary.totalSaved)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">Total targets</p>
                    <p className="text-xl font-bold">{formatCurrency(data.summary.totalTargets)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">Progress</p>
                    <p className="text-xl font-bold">{data.summary.overallProgress.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">This month</p>
                    <p className="text-xl font-bold">{formatCurrency(data.summary.monthlyContributions)}</p>
                  </div>
                </div>
              ) : null}

              {activeGoals.length === 0 && completedGoals.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                  <p className="text-lg font-semibold">No savings goals yet</p>
                  <p className="mt-2 text-[var(--muted)]">Create a goal to start tracking savings progress.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold">Active savings</h2>
                  <ul className="space-y-4">
                    {activeGoals.map(({ goal, calculations, status, forecast, milestonesReached }) => {
                      const goalContributions = data?.contributionsByGoal[goal.id] ?? [];
                      return (
                        <li key={goal.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{goal.name}</p>
                              <p className="text-sm text-[var(--muted)]">
                                {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)} -{' '}
                                {calculations.progressPercentage.toFixed(1)}%
                              </p>
                            </div>
                            <span className="rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-xs font-semibold">
                              {formatGoalStatusEmoji(status)} {goalStatusLabel(status)}
                            </span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                            <div
                              className="h-full rounded-full bg-[var(--primary)]"
                              style={{ width: `${Math.min(100, calculations.progressPercentage)}%` }}
                            />
                          </div>
                          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                            <p>
                              <span className="text-[var(--muted)]">Remaining:</span>{' '}
                              {formatCurrency(calculations.remainingAmount)}
                            </p>
                            <p>
                              <span className="text-[var(--muted)]">Required/day:</span>{' '}
                              {formatCurrency(Math.ceil(calculations.requiredDailySavings))}
                            </p>
                            <p>
                              <span className="text-[var(--muted)]">Milestones:</span>{' '}
                              {milestonesReached.length || 0}/4
                            </p>
                          </div>
                          {forecast.forecastMessage ? (
                            <p className="mt-3 text-sm text-primary">{forecast.forecastMessage}</p>
                          ) : null}
                          <div className="mt-4 rounded-lg bg-[var(--surface-elevated)] p-3">
                            <p className="text-sm font-semibold">History</p>
                            {goalContributions.length === 0 ? (
                              <p className="mt-1 text-sm text-[var(--muted)]">No contributions yet.</p>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {goalContributions.slice(0, 5).map((contribution) => (
                                  <div key={contribution.id} className="flex justify-between gap-3 text-sm">
                                    <span className="text-[var(--muted)]">
                                      {contribution.contribution_date} - {contribution.source ?? 'Savings'}
                                    </span>
                                    <span className="font-semibold text-emerald-600">
                                      +{formatCurrency(contribution.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {completedGoals.length > 0 ? (
                    <>
                      <h2 className="text-lg font-bold">Completed</h2>
                      <ul className="space-y-4">
                        {completedGoals.map(({ goal }) => (
                          <li key={goal.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                            <p className="font-semibold">{goal.name}</p>
                            <p className="text-sm text-[var(--muted)]">
                              {formatCurrency(goal.current_amount)} saved
                            </p>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <h2 className="font-bold">Create savings goal</h2>
                <div className="mt-4 space-y-3">
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    value={goalForm.category}
                    onChange={(e) => {
                      const category = e.target.value as SavingsGoalCategory;
                      const meta = SAVINGS_GOAL_CATEGORIES.find((item) => item.value === category);
                      setGoalForm((form) => ({
                        ...form,
                        category,
                        name: form.name || meta?.defaultName || form.name,
                      }));
                    }}
                  >
                    {SAVINGS_GOAL_CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    placeholder="Goal name"
                    value={goalForm.name}
                    onChange={(e) => setGoalForm((form) => ({ ...form, name: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    inputMode="decimal"
                    placeholder="Target amount"
                    value={goalForm.target}
                    onChange={(e) => setGoalForm((form) => ({ ...form, target: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    inputMode="decimal"
                    placeholder="Current saved"
                    value={goalForm.current}
                    onChange={(e) => setGoalForm((form) => ({ ...form, current: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    placeholder="Target date YYYY-MM-DD"
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm((form) => ({ ...form, targetDate: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    value={goalForm.priority}
                    onChange={(e) => setGoalForm((form) => ({ ...form, priority: e.target.value as SavingsGoalPriority }))}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    placeholder="Description"
                    value={goalForm.description}
                    onChange={(e) => setGoalForm((form) => ({ ...form, description: e.target.value }))}
                  />
                  <button
                    className="w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60 dark:text-slate-950"
                    disabled={saving}
                    onClick={() => void submitGoal()}
                    type="button"
                  >
                    Create goal
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <h2 className="font-bold">Add savings</h2>
                <div className="mt-4 space-y-3">
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    value={contributionForm.goalId}
                    onChange={(e) => setContributionForm((form) => ({ ...form, goalId: e.target.value }))}
                  >
                    <option value="">Choose goal</option>
                    {activeGoals.map(({ goal }) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={contributionForm.amount}
                    onChange={(e) => setContributionForm((form) => ({ ...form, amount: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    value={contributionForm.date}
                    onChange={(e) => setContributionForm((form) => ({ ...form, date: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    placeholder="Source"
                    value={contributionForm.source}
                    onChange={(e) => setContributionForm((form) => ({ ...form, source: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    placeholder="Note"
                    value={contributionForm.notes}
                    onChange={(e) => setContributionForm((form) => ({ ...form, notes: e.target.value }))}
                  />
                  <button
                    className="w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60 dark:text-slate-950"
                    disabled={saving || !contributionForm.goalId}
                    onClick={() => void submitContribution()}
                    type="button"
                  >
                    Save contribution
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
