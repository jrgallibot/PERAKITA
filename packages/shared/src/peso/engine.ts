import type {
  ForecastResult,
  HealthScoreBreakdown,
  SavingsPaceResult,
  SpendingRiskResult,
} from './types';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseIsoDay(fromIso);
  const to = parseIsoDay(toIso);
  if (!from || !to) return 0;
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function todayIso(): string {
  return toIsoDay(new Date());
}

export interface RealAvailableInput {
  balance: number;
  upcomingCommitments: number;
  plannedSavings: number;
}

export function computeRealAvailable(input: RealAvailableInput): number {
  const balance = Number.isFinite(input.balance) ? input.balance : 0;
  const commitments = Number.isFinite(input.upcomingCommitments) ? input.upcomingCommitments : 0;
  const savings = Number.isFinite(input.plannedSavings) ? input.plannedSavings : 0;
  return roundMoney(Math.max(0, balance - commitments - savings));
}

export interface SafeToSpendInput {
  realAvailable: number;
  daysUntilPayday: number;
}

export function computeSafeToSpendDaily(input: SafeToSpendInput): number {
  const days = Math.max(1, input.daysUntilPayday || 1);
  const available = Number.isFinite(input.realAvailable) ? input.realAvailable : 0;
  return roundMoney(Math.max(0, available / days));
}

export interface ForecastInput {
  balance: number;
  avgDailySpend: number;
  daysRemaining: number;
  upcomingCommitments: number;
  plannedSavings: number;
  nextPayday: string | null;
  today?: string;
}

export function computeForecast(input: ForecastInput): ForecastResult {
  const today = input.today ?? todayIso();
  const days = Math.max(0, input.daysRemaining);
  const avg = Number.isFinite(input.avgDailySpend) ? Math.max(0, input.avgDailySpend) : 0;
  const balance = Number.isFinite(input.balance) ? input.balance : 0;
  const commitments = Number.isFinite(input.upcomingCommitments) ? input.upcomingCommitments : 0;
  const savings = Number.isFinite(input.plannedSavings) ? input.plannedSavings : 0;

  const projectedSpending = roundMoney(avg * days + commitments + savings);
  const projectedBalance = roundMoney(balance - projectedSpending);

  let daysUntilZero: number | null = null;
  if (avg > 0 && balance > 0) {
    const netDailyBurn = avg + (days > 0 ? (commitments + savings) / days : 0);
    daysUntilZero = netDailyBurn > 0 ? Math.floor(balance / netDailyBurn) : null;
  } else if (balance <= 0) {
    daysUntilZero = 0;
  }

  let runsOutBeforePayday = false;
  let daysBeforePaydayShort: number | null = null;
  if (input.nextPayday && daysUntilZero !== null) {
    const daysToPayday = daysBetween(today, input.nextPayday);
    if (daysUntilZero < daysToPayday) {
      runsOutBeforePayday = true;
      daysBeforePaydayShort = daysToPayday - daysUntilZero;
    }
  }

  let warning: string | null = null;
  if (projectedBalance < 0) {
    warning = 'At your current spending rate, your money may run out before your next payday.';
  } else if (runsOutBeforePayday && daysBeforePaydayShort !== null) {
    warning = `At your current spending rate, your money may run out ${daysBeforePaydayShort} day${daysBeforePaydayShort === 1 ? '' : 's'} before your next payday.`;
  }

  return {
    projectedBalance,
    projectedSpending,
    daysUntilZero,
    runsOutBeforePayday,
    daysBeforePaydayShort,
    warning,
  };
}

export interface SavingsPaceInput {
  target: number;
  current: number;
  targetDate: string | null;
  today?: string;
}

export function computeSavingsPace(input: SavingsPaceInput): SavingsPaceResult {
  const today = input.today ?? todayIso();
  const target = Number.isFinite(input.target) ? input.target : 0;
  const current = Number.isFinite(input.current) ? input.current : 0;
  const remaining = roundMoney(Math.max(0, target - current));

  let daysLeft = 30;
  if (input.targetDate) {
    daysLeft = Math.max(1, daysBetween(today, input.targetDate));
  }

  const daily = roundMoney(remaining / daysLeft);
  const weekly = roundMoney(daily * 7);
  const monthly = roundMoney(daily * 30);

  return { remaining, daysLeft, daily, weekly, monthly };
}

export interface HealthScoreInput {
  budgetCompliancePercent: number;
  savingsRatePercent: number;
  debtToIncomeRatio: number;
  expenseStabilityPercent: number;
  emergencyFundProgressPercent: number;
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreBreakdown {
  const budget = Math.min(100, Math.max(0, input.budgetCompliancePercent));
  const savings = Math.min(100, Math.max(0, input.savingsRatePercent));
  const debtScore = Math.min(100, Math.max(0, 100 - input.debtToIncomeRatio * 100));
  const stability = Math.min(100, Math.max(0, input.expenseStabilityPercent));
  const emergency = Math.min(100, Math.max(0, input.emergencyFundProgressPercent));

  const score = Math.round(
    budget * 0.25 + savings * 0.25 + debtScore * 0.2 + stability * 0.15 + emergency * 0.15
  );

  const strong: string[] = [];
  const needsImprovement: string[] = [];

  if (debtScore >= 70) strong.push('Debt payments');
  else needsImprovement.push('Debt management');

  if (savings >= 60) strong.push('Savings consistency');
  else needsImprovement.push('Savings consistency');

  if (budget >= 70) strong.push('Budget compliance');
  else needsImprovement.push('Budget compliance');

  if (stability >= 60) strong.push('Expense stability');
  else needsImprovement.push('Expense stability');

  if (emergency >= 50) strong.push('Emergency fund progress');
  else needsImprovement.push('Emergency fund progress');

  return {
    score: Math.min(100, Math.max(0, score)),
    strong: strong.slice(0, 2),
    needsImprovement: needsImprovement.slice(0, 2),
  };
}

export interface SpendingRiskInput {
  forecast: ForecastResult;
  recentDailyAvg: number;
  baselineDailyAvg: number;
}

export function detectSpendingRisk(input: SpendingRiskInput): SpendingRiskResult {
  const { forecast, recentDailyAvg, baselineDailyAvg } = input;
  const spike =
    baselineDailyAvg > 0 && recentDailyAvg > baselineDailyAvg * 1.25;

  if (forecast.runsOutBeforePayday || forecast.projectedBalance < 0) {
    return {
      detected: true,
      severity: 'high',
      message: forecast.warning ?? 'Spending Risk Detected',
    };
  }

  if (spike) {
    return {
      detected: true,
      severity: 'moderate',
      message: 'Spending Risk Detected — your recent spending is higher than usual.',
    };
  }

  return { detected: false, severity: 'none', message: null };
}

export function computeDaysUntilPayday(nextPayday: string | null, today?: string): number {
  if (!nextPayday) return 30;
  const from = today ?? todayIso();
  const days = daysBetween(from, nextPayday);
  return days > 0 ? days : 30;
}

export function computeAvgDailySpend(
  totalExpenses: number,
  dayCount: number
): number {
  const days = Math.max(1, dayCount);
  return roundMoney(totalExpenses / days);
}

export function recommendEmergencyFundTarget(monthlyEssentials: number): number {
  return roundMoney(Math.max(0, monthlyEssentials * 3));
}
