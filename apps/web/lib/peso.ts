import type { PesoDashboardSnapshot } from '@perakita/shared';
import { generatePesoInsight, answerPesoChat } from '@perakita/shared';
import {
  computeAvgDailySpend,
  computeDaysUntilPayday,
  computeForecast,
  computeHealthScore,
  computeRealAvailable,
  computeSafeToSpendDaily,
  detectSpendingRisk,
  recommendEmergencyFundTarget,
  todayIso,
} from '@perakita/shared';
import { supabase } from '@/lib/supabase';

function monthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function loadWebPesoDashboard(userId: string): Promise<PesoDashboardSnapshot> {
  const today = todayIso();
  const month = monthRange();

  const [
    balanceRes,
    monthTxRes,
    profileRes,
    financialRes,
    recurringRes,
    budgetsRes,
    budgetSpendRes,
    loansRes,
    savingsRes,
    emergencyRes,
    recentRes,
    baselineRes,
  ] = await Promise.all([
    supabase.from('transactions').select('amount, type').eq('user_id', userId).is('deleted_at', null).in('type', ['income', 'expense']),
    supabase.from('transactions').select('amount, type').eq('user_id', userId).is('deleted_at', null).gte('transaction_date', month.start).lte('transaction_date', month.end),
    supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle(),
    supabase.from('financial_profiles').select('*').eq('user_id', userId).is('deleted_at', null).maybeSingle(),
    supabase.from('recurring_expenses').select('*').eq('user_id', userId).is('deleted_at', null).eq('is_active', true).gte('next_due_date', today).lte('next_due_date', daysAgoIso(-30)),
    supabase.from('budgets').select('*').eq('user_id', userId).is('deleted_at', null),
    supabase.from('transactions').select('amount, budget_id').eq('user_id', userId).is('deleted_at', null).in('type', ['expense', 'adjustment']),
    supabase.from('loans').select('*').eq('user_id', userId).is('deleted_at', null),
    supabase.from('savings_goals').select('current_amount').eq('user_id', userId).is('deleted_at', null),
    supabase.from('emergency_fund_targets').select('*').eq('user_id', userId).is('deleted_at', null).maybeSingle(),
    supabase.from('transactions').select('amount, type').eq('user_id', userId).is('deleted_at', null).eq('type', 'expense').gte('transaction_date', daysAgoIso(7)).lte('transaction_date', today),
    supabase.from('transactions').select('amount, type').eq('user_id', userId).is('deleted_at', null).eq('type', 'expense').gte('transaction_date', daysAgoIso(30)).lte('transaction_date', daysAgoIso(8)),
  ]);

  const balanceRows = balanceRes.data ?? [];
  let balance = 0;
  for (const row of balanceRows) {
    balance += row.type === 'income' ? Number(row.amount) : -Number(row.amount);
  }

  const monthRows = monthTxRes.data ?? [];
  let income = 0;
  let expenses = 0;
  for (const row of monthRows) {
    if (row.type === 'income') income += Number(row.amount);
    if (row.type === 'expense') expenses += Number(row.amount);
  }

  const financialProfile = financialRes.data;
  const recurring = recurringRes.data ?? [];
  const recurringTotal = recurring.reduce((s, r) => s + Number(r.amount), 0);

  const loans = loansRes.data ?? [];
  const activeLoans = loans.filter(
    (l) => l.loan_type === 'debt' && l.status !== 'paid' && l.status !== 'cancelled'
  );
  const totalDebt = activeLoans.reduce((s, l) => s + Number(l.remaining_amount), 0);

  const loanBills = activeLoans
    .filter((l) => l.due_date && l.due_date >= today && l.due_date <= month.end)
    .map((l) => ({
      id: l.id,
      name: l.person_name,
      amount: Number(l.remaining_amount),
      due_date: l.due_date as string,
      source: 'loan' as const,
    }));

  const recurringBills = recurring.map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    due_date: r.next_due_date,
    source: 'recurring' as const,
  }));

  const upcomingBills = [...recurringBills, ...loanBills].sort((a, b) =>
    a.due_date.localeCompare(b.due_date)
  );

  const upcomingCommitments = recurringTotal + loanBills.reduce((s, b) => s + b.amount, 0);

  const budgets = budgetsRes.data ?? [];
  const spendRows = budgetSpendRes.data ?? [];
  const budgetSpent = new Map<string, number>();
  for (const row of spendRows) {
    if (!row.budget_id) continue;
    budgetSpent.set(row.budget_id, (budgetSpent.get(row.budget_id) ?? 0) + Number(row.amount));
  }

  let budgetComplianceSum = 0;
  let plannedSavings = 0;
  for (const b of budgets) {
    const spent = budgetSpent.get(b.id) ?? 0;
    const total = Number(b.total_amount);
    const pct = total > 0 ? (spent / total) * 100 : 0;
    budgetComplianceSum += Math.min(100, 100 - pct);
    plannedSavings += Math.max(0, total - spent) * 0.1;
  }
  const budgetCompliance = budgets.length > 0 ? budgetComplianceSum / budgets.length : 70;

  const realAvailable = computeRealAvailable({ balance, upcomingCommitments, plannedSavings });
  const daysUntilPayday = financialProfile?.next_payday
    ? computeDaysUntilPayday(financialProfile.next_payday, today)
    : 30;
  const safeToSpendToday = computeSafeToSpendDaily({ realAvailable, daysUntilPayday });

  const recentExpenseTotal = (recentRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const baselineExpenseTotal = (baselineRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const recentDailyAvg = computeAvgDailySpend(recentExpenseTotal, 7);
  const baselineDailyAvg = computeAvgDailySpend(baselineExpenseTotal, 23);
  const avgDailySpend = recentDailyAvg || baselineDailyAvg;

  const forecast = computeForecast({
    balance,
    avgDailySpend,
    daysRemaining: daysUntilPayday,
    upcomingCommitments,
    plannedSavings,
    nextPayday: financialProfile?.next_payday ?? null,
    today,
  });

  const spendingRisk = detectSpendingRisk({ forecast, recentDailyAvg, baselineDailyAvg });

  const totalSaved = (savingsRes.data ?? []).reduce((s, g) => s + Number(g.current_amount), 0);
  const monthlyIncome = Number(financialProfile?.income_amount ?? income);
  const savingsRate = monthlyIncome > 0 ? Math.min(100, (totalSaved / monthlyIncome) * 100) : 50;
  const debtRatio = monthlyIncome > 0 ? totalDebt / monthlyIncome : 0;

  const emergency = emergencyRes.data;
  const emergencyTarget =
    Number(emergency?.target_amount ?? 0) || recommendEmergencyFundTarget(expenses * 0.6);
  const emergencyProgress =
    emergencyTarget > 0
      ? Math.min(100, (Number(emergency?.current_amount ?? totalSaved) / emergencyTarget) * 100)
      : 0;

  const healthScore = computeHealthScore({
    budgetCompliancePercent: budgetCompliance,
    savingsRatePercent: savingsRate,
    debtToIncomeRatio: debtRatio,
    expenseStabilityPercent:
      baselineDailyAvg > 0 ? Math.min(100, (baselineDailyAvg / Math.max(recentDailyAvg, 1)) * 100) : 70,
    emergencyFundProgressPercent: emergencyProgress,
  });

  void profileRes;

  return {
    currentBalance: balance,
    realAvailable,
    safeToSpendToday,
    daysUntilPayday,
    monthlyIncome,
    monthlyExpenses: expenses,
    totalSavings: totalSaved,
    totalDebt,
    healthScore,
    upcomingBills,
    forecast,
    spendingRisk,
    avgDailySpend,
    plannedSavings,
    upcomingCommitments,
  };
}

export async function isWebOnboardingComplete(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('financial_profiles')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  return data?.onboarding_completed === true;
}

export async function saveWebOnboarding(
  userId: string,
  input: {
    display_name: string;
    current_money: number;
    income_source: string;
    income_amount: number;
    income_frequency: string;
    next_payday: string;
  }
): Promise<void> {
  await supabase.from('profiles').update({ display_name: input.display_name }).eq('user_id', userId);
  const { data: existing } = await supabase
    .from('financial_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  const row = {
    user_id: userId,
    currency: 'PHP',
    current_money: input.current_money,
    income_source: input.income_source,
    income_amount: input.income_amount,
    income_frequency: input.income_frequency,
    next_payday: input.next_payday,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
    sync_status: 'synced',
  };
  if (existing?.id) {
    await supabase.from('financial_profiles').update(row).eq('id', existing.id);
  } else {
    await supabase.from('financial_profiles').insert({
      ...row,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      version: 1,
    });
  }
}

export async function loadWebBudgetRows(
  userId: string,
): Promise<Array<{ id: string; name: string; percent: number }>> {
  const [budgetsRes, spendRes] = await Promise.all([
    supabase.from('budgets').select('id, name, total_amount').eq('user_id', userId).is('deleted_at', null),
    supabase
      .from('transactions')
      .select('amount, budget_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('type', ['expense', 'adjustment']),
  ]);
  const spendByBudget = new Map<string, number>();
  for (const row of spendRes.data ?? []) {
    if (!row.budget_id) continue;
    spendByBudget.set(row.budget_id, (spendByBudget.get(row.budget_id) ?? 0) + Number(row.amount));
  }
  return (budgetsRes.data ?? []).map((budget) => {
    const total = Number(budget.total_amount);
    const spent = spendByBudget.get(budget.id as string) ?? 0;
    return {
      id: budget.id as string,
      name: budget.name as string,
      percent: total > 0 ? Math.round((spent / total) * 100) : 0,
    };
  });
}

/** Local PeraKita AI insight from a dashboard snapshot (no third-party API). */
export async function fetchWebAiInsight(snapshot: PesoDashboardSnapshot): Promise<string | null> {
  return generatePesoInsight(snapshot);
}

/** Local PeraKita AI chat from a dashboard snapshot. */
export async function sendWebAiChat(message: string, snapshot: PesoDashboardSnapshot): Promise<string> {
  return answerPesoChat(message, snapshot);
}
