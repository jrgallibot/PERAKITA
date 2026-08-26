import type {
  PesoDashboardSnapshot,
  UpcomingBill,
} from '@perakita/shared';
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
import { financialProfileRepository } from '@/database/repositories/financialProfileRepository';
import { recurringExpenseRepository } from '@/database/repositories/recurringExpenseRepository';
import { savingsGoalRepository } from '@/database/repositories/savingsGoalRepository';
import { emergencyFundRepository } from '@/database/repositories/emergencyFundRepository';
import { budgetRepository } from '@/database/repositories/budgetRepository';
import { loanRepository } from '@/database/repositories/loanRepository';
import { transactionRepository } from '@/database/repositories/transactionRepository';

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function loadPesoDashboard(userId: string): Promise<PesoDashboardSnapshot> {
  const today = todayIso();
  const month = monthRange();
  const daysUntilPaydayDefault = 30;

  const [
    balance,
    totals,
    profile,
    financialProfile,
    recurring,
    recurringTotal,
    budgets,
    loans,
    totalSaved,
    emergencyFund,
    recentExpenses,
    baselineExpenses,
  ] = await Promise.all([
    transactionRepository.getIncomeExpenseBalance(userId),
    transactionRepository.getMonthlyTotals(userId, month.start, month.end),
    transactionRepository.findByDateRange(userId, daysAgoIso(14), today),
    financialProfileRepository.findByUserId(userId),
    recurringExpenseRepository.getUpcoming(userId, daysUntilPaydayDefault),
    recurringExpenseRepository.getUpcomingTotal(userId, daysUntilPaydayDefault),
    budgetRepository.findAllWithProgress(userId),
    loanRepository.findAll(userId),
    savingsGoalRepository.getTotalSaved(userId),
    emergencyFundRepository.findByUserId(userId),
    transactionRepository.findByDateRange(userId, daysAgoIso(7), today),
    transactionRepository.findByDateRange(userId, daysAgoIso(30), daysAgoIso(8)),
  ]);

  const activeLoans = loans.filter(
    (l) => l.loan_type === 'debt' && l.status !== 'paid' && l.status !== 'cancelled'
  );
  const totalDebt = activeLoans.reduce((sum, l) => sum + l.remaining_amount, 0);

  const loanBills: UpcomingBill[] = activeLoans
    .filter((l) => l.due_date && l.due_date >= today && l.due_date <= month.end)
    .map((l) => ({
      id: l.id,
      name: l.person_name,
      amount: l.remaining_amount,
      due_date: l.due_date!,
      source: 'loan' as const,
    }));

  const recurringBills: UpcomingBill[] = recurring.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    due_date: r.next_due_date,
    source: 'recurring' as const,
  }));

  const upcomingBills = [...recurringBills, ...loanBills].sort((a, b) =>
    a.due_date.localeCompare(b.due_date)
  );

  const upcomingCommitments = recurringTotal + loanBills.reduce((s, b) => s + b.amount, 0);

  const plannedSavings = budgets.reduce((sum, b) => {
    const remaining = Math.max(0, b.total_amount - b.spent);
    return sum + remaining * 0.1;
  }, 0);

  const realAvailable = computeRealAvailable({
    balance,
    upcomingCommitments,
    plannedSavings,
  });

  const daysUntilPayday = financialProfile?.next_payday
    ? computeDaysUntilPayday(financialProfile.next_payday, today)
    : daysUntilPaydayDefault;

  const safeToSpendToday = computeSafeToSpendDaily({
    realAvailable,
    daysUntilPayday,
  });

  const recentExpenseTotal = recentExpenses
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const baselineExpenseTotal = baselineExpenses
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

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

  const spendingRisk = detectSpendingRisk({
    forecast,
    recentDailyAvg,
    baselineDailyAvg,
  });

  const budgetCompliance =
    budgets.length > 0
      ? budgets.reduce((sum, b) => sum + Math.min(100, 100 - b.percent), 0) / budgets.length
      : 70;

  const monthlyIncome = financialProfile?.income_amount ?? totals.income;
  const savingsRate =
    monthlyIncome > 0 ? Math.min(100, (totalSaved / monthlyIncome) * 100) : 50;

  const debtRatio = monthlyIncome > 0 ? totalDebt / monthlyIncome : 0;

  const emergencyTarget =
    emergencyFund?.target_amount ?? recommendEmergencyFundTarget(totals.expenses * 0.6);
  const emergencyProgress =
    emergencyTarget > 0
      ? Math.min(100, ((emergencyFund?.current_amount ?? totalSaved) / emergencyTarget) * 100)
      : 0;

  const healthScore = computeHealthScore({
    budgetCompliancePercent: budgetCompliance,
    savingsRatePercent: savingsRate,
    debtToIncomeRatio: debtRatio,
    expenseStabilityPercent: baselineDailyAvg > 0 ? Math.min(100, (baselineDailyAvg / Math.max(recentDailyAvg, 1)) * 100) : 70,
    emergencyFundProgressPercent: emergencyProgress,
  });

  return {
    currentBalance: balance,
    realAvailable,
    safeToSpendToday,
    daysUntilPayday,
    monthlyIncome,
    monthlyExpenses: totals.expenses,
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

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const profile = await financialProfileRepository.findByUserId(userId);
  return profile?.onboarding_completed === true;
}
