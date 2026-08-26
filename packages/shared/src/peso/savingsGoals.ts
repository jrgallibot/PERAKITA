import type {
  GoalFeasibility,
  GoalMilestone,
  GoalStatus,
  PesoDashboardSnapshot,
  SavingsContribution,
  SavingsGoal,
  SavingsGoalCategory,
} from './types';
import { computeSavingsPace, daysBetween, todayIso } from './engine';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(iso: string, days: number): string {
  const date = parseIsoDay(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonthYear(iso: string): string {
  const date = parseIsoDay(iso);
  if (!date) return iso;
  return date.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
}

export const GOAL_MILESTONE_PERCENTAGES = [25, 50, 75, 100] as const;

export const SAVINGS_GOAL_CATEGORIES: Array<{
  value: SavingsGoalCategory;
  label: string;
  icon: string;
  defaultName: string;
}> = [
  { value: 'emergency_fund', label: 'Emergency Fund', icon: 'shield-outline', defaultName: 'Emergency Fund' },
  { value: 'phone', label: 'Phone', icon: 'phone-portrait-outline', defaultName: 'New Phone' },
  { value: 'laptop', label: 'Laptop', icon: 'laptop-outline', defaultName: 'New Laptop' },
  { value: 'vacation', label: 'Vacation', icon: 'airplane-outline', defaultName: 'Vacation' },
  { value: 'tuition', label: 'Tuition', icon: 'school-outline', defaultName: 'Tuition' },
  { value: 'wedding', label: 'Wedding', icon: 'heart-outline', defaultName: 'Wedding' },
  { value: 'house', label: 'House', icon: 'home-outline', defaultName: 'House' },
  { value: 'motorcycle', label: 'Motorcycle', icon: 'bicycle-outline', defaultName: 'Motorcycle' },
  { value: 'car', label: 'Car', icon: 'car-outline', defaultName: 'Car' },
  { value: 'business', label: 'Business', icon: 'briefcase-outline', defaultName: 'Business' },
  { value: 'other', label: 'Custom Goal', icon: 'flag-outline', defaultName: 'Savings Goal' },
];

export interface GoalCalculations {
  remainingAmount: number;
  progressPercentage: number;
  daysRemaining: number | null;
  requiredDailySavings: number;
  requiredWeeklySavings: number;
  requiredMonthlySavings: number;
  remainingMonths: number | null;
}

export interface GoalForecast {
  currentDailySavingsRate: number | null;
  projectedCompletionDate: string | null;
  projectedCompletionAmount: number;
  amountBehindSchedule: number;
  amountAheadOfSchedule: number;
  daysLate: number | null;
  additionalDailySavingsNeeded: number | null;
  hasReliableHistory: boolean;
  forecastMessage: string | null;
}

export interface GoalAnalysis {
  feasibility: GoalFeasibility;
  monthlyRequired: number;
  monthlyAvailable: number;
  message: string;
  suggestedTargetDate: string | null;
}

export interface GoalSummary {
  activeGoals: number;
  totalSaved: number;
  totalTargets: number;
  totalRemaining: number;
  overallProgress: number;
  monthlyContributions: number;
}

export interface ContributionStats {
  totalThisMonth: number;
  averageContribution: number;
  largestContribution: number;
  contributionCount: number;
  frequencyLabel: string;
}

export interface EnrichedSavingsGoal {
  goal: SavingsGoal;
  calculations: GoalCalculations;
  status: GoalStatus;
  forecast: GoalForecast;
  milestonesReached: number[];
}

export interface SavingsAllocationRecommendation {
  goalId: string;
  goalName: string;
  recommendedAmount: number;
  reason: string;
}

export function computeGoalProgress(
  targetAmount: number,
  currentAmount: number,
): { remainingAmount: number; progressPercentage: number } {
  const target = Number.isFinite(targetAmount) ? Math.max(0, targetAmount) : 0;
  const current = Number.isFinite(currentAmount) ? Math.max(0, currentAmount) : 0;
  const remainingAmount = roundMoney(Math.max(0, target - current));
  const progressPercentage =
    target > 0 ? roundMoney(Math.min(100, (current / target) * 100)) : current > 0 ? 100 : 0;
  return { remainingAmount, progressPercentage };
}

/** Deterministic savings pace and progress metrics for a goal. */
export function computeGoalCalculations(
  goal: Pick<SavingsGoal, 'target_amount' | 'current_amount' | 'target_date'>,
  today: string = todayIso(),
): GoalCalculations {
  const { remainingAmount, progressPercentage } = computeGoalProgress(
    goal.target_amount,
    goal.current_amount,
  );

  const pace = computeSavingsPace({
    target: goal.target_amount,
    current: goal.current_amount,
    targetDate: goal.target_date,
    today,
  });

  let remainingMonths: number | null = null;
  if (goal.target_date) {
    const daysRemaining = Math.max(0, daysBetween(today, goal.target_date));
    remainingMonths = daysRemaining > 0 ? Math.max(1, daysRemaining / 30) : 0;
  }

  const requiredMonthlySavings =
    remainingMonths && remainingMonths > 0
      ? roundMoney(remainingAmount / remainingMonths)
      : pace.monthly;

  return {
    remainingAmount,
    progressPercentage,
    daysRemaining: goal.target_date ? pace.daysLeft : null,
    requiredDailySavings: pace.daily,
    requiredWeeklySavings: pace.weekly,
    requiredMonthlySavings,
    remainingMonths,
  };
}

export function computeCurrentDailySavingsRate(
  contributions: SavingsContribution[],
  today: string = todayIso(),
  lookbackDays = 30,
): number | null {
  const active = contributions
    .filter((c) => !c.deleted_at)
    .sort((a, b) => a.contribution_date.localeCompare(b.contribution_date));

  if (active.length === 0) return null;

  const cutoff = addDays(today, -lookbackDays);
  const recent = active.filter((c) => c.contribution_date >= cutoff);
  const pool = recent.length > 0 ? recent : active.slice(-5);
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, c) => sum + c.amount, 0);
  const firstDate = pool[0].contribution_date;
  const spanDays = Math.max(1, daysBetween(firstDate, today));
  return roundMoney(total / spanDays);
}

/** Project when a goal will be completed from historical contribution pace. */
export function computeGoalForecast(
  goal: Pick<SavingsGoal, 'target_amount' | 'current_amount' | 'target_date'>,
  contributions: SavingsContribution[],
  today: string = todayIso(),
): GoalForecast {
  const { remainingAmount } = computeGoalProgress(goal.target_amount, goal.current_amount);
  const calculations = computeGoalCalculations(goal, today);
  const currentDailySavingsRate = computeCurrentDailySavingsRate(contributions, today);
  const hasReliableHistory = currentDailySavingsRate != null && contributions.filter((c) => !c.deleted_at).length >= 2;

  if (goal.current_amount >= goal.target_amount) {
    return {
      currentDailySavingsRate,
      projectedCompletionDate: today,
      projectedCompletionAmount: goal.target_amount,
      amountBehindSchedule: 0,
      amountAheadOfSchedule: roundMoney(goal.current_amount - goal.target_amount),
      daysLate: 0,
      additionalDailySavingsNeeded: 0,
      hasReliableHistory,
      forecastMessage: null,
    };
  }

  if (!currentDailySavingsRate || currentDailySavingsRate <= 0) {
    return {
      currentDailySavingsRate,
      projectedCompletionDate: null,
      projectedCompletionAmount: goal.current_amount,
      amountBehindSchedule: 0,
      amountAheadOfSchedule: 0,
      daysLate: null,
      additionalDailySavingsNeeded: null,
      hasReliableHistory: false,
      forecastMessage: 'Not enough savings history to provide a reliable forecast yet.',
    };
  }

  const daysToComplete = Math.ceil(remainingAmount / currentDailySavingsRate);
  const projectedCompletionDate = addDays(today, daysToComplete);
  const projectedCompletionAmount = goal.target_amount;

  let daysLate: number | null = null;
  let amountBehindSchedule = 0;
  let amountAheadOfSchedule = 0;
  let additionalDailySavingsNeeded: number | null = null;
  let forecastMessage: string | null = null;

  if (goal.target_date) {
    daysLate = daysBetween(goal.target_date, projectedCompletionDate);
    const expectedSavedByTarget = calculations.requiredDailySavings * (calculations.daysRemaining ?? 0);
    const paceGap = calculations.requiredDailySavings - currentDailySavingsRate;
    additionalDailySavingsNeeded =
      paceGap > 0 ? roundMoney(paceGap) : 0;

    if (daysLate > 0) {
      amountBehindSchedule = roundMoney(currentDailySavingsRate * daysLate);
      forecastMessage = `You may miss your target date by approximately ${daysLate} day${daysLate === 1 ? '' : 's'}.`;
      if (additionalDailySavingsNeeded && additionalDailySavingsNeeded > 0) {
        forecastMessage += ` You need approximately ₱${Math.ceil(additionalDailySavingsNeeded)} more per day to reach your original target date.`;
      }
    } else {
      amountAheadOfSchedule = roundMoney(Math.abs(paceGap) * (calculations.daysRemaining ?? 0));
      forecastMessage = 'You are ahead of schedule.';
    }
  }

  return {
    currentDailySavingsRate,
    projectedCompletionDate,
    projectedCompletionAmount,
    amountBehindSchedule,
    amountAheadOfSchedule,
    daysLate,
    additionalDailySavingsNeeded,
    hasReliableHistory,
    forecastMessage,
  };
}

/** Deterministic goal status from pace and forecast. */
export function computeGoalStatus(
  goal: Pick<SavingsGoal, 'target_amount' | 'current_amount' | 'target_date'>,
  contributions: SavingsContribution[],
  today: string = todayIso(),
): GoalStatus {
  if (goal.current_amount >= goal.target_amount) return 'completed';

  const calculations = computeGoalCalculations(goal, today);
  const forecast = computeGoalForecast(goal, contributions, today);
  const required = calculations.requiredDailySavings;
  const currentRate = forecast.currentDailySavingsRate ?? 0;

  if (goal.target_date) {
    const daysLeft = calculations.daysRemaining ?? 0;
    if (daysLeft <= 0) return 'at_risk';
    if (forecast.daysLate != null && forecast.daysLate >= 14) return 'at_risk';
  }

  if (currentRate <= 0) {
    return goal.target_date ? 'behind' : 'on_track';
  }

  if (currentRate >= required * 0.95) return 'on_track';
  if (currentRate >= required * 0.7) return 'behind';
  return 'at_risk';
}

export function computeContributionStats(
  contributions: SavingsContribution[],
  today: string = todayIso(),
): ContributionStats {
  const active = contributions.filter((c) => !c.deleted_at);
  const monthPrefix = today.slice(0, 7);
  const thisMonth = active.filter((c) => c.contribution_date.startsWith(monthPrefix));
  const totalThisMonth = roundMoney(thisMonth.reduce((sum, c) => sum + c.amount, 0));
  const averageContribution =
    active.length > 0
      ? roundMoney(active.reduce((sum, c) => sum + c.amount, 0) / active.length)
      : 0;
  const largestContribution =
    active.length > 0 ? Math.max(...active.map((c) => c.amount)) : 0;

  let frequencyLabel = 'No contributions yet';
  if (active.length >= 4) frequencyLabel = 'Regular saver';
  else if (active.length >= 2) frequencyLabel = 'Occasional contributions';
  else if (active.length === 1) frequencyLabel = 'First contribution recorded';

  return {
    totalThisMonth,
    averageContribution,
    largestContribution,
    contributionCount: active.length,
    frequencyLabel,
  };
}

export function detectNewMilestones(
  progressPercentage: number,
  existing: GoalMilestone[],
): number[] {
  const reached = new Set(existing.filter((m) => !m.deleted_at).map((m) => m.percentage));
  return GOAL_MILESTONE_PERCENTAGES.filter(
    (pct) => progressPercentage >= pct && !reached.has(pct),
  );
}

export function milestoneMessage(goalName: string, percentage: number): string {
  if (percentage >= 100) return `🎉 Goal Completed! You finished "${goalName}".`;
  if (percentage >= 75) return `🔥 Almost there! You reached 75% of "${goalName}".`;
  if (percentage >= 50) return `🔥 Halfway there! You reached 50% of "${goalName}".`;
  return `🎉 You reached 25% of your "${goalName}" goal!`;
}

export function analyzeGoalFeasibility(
  goal: SavingsGoal,
  snapshot: PesoDashboardSnapshot,
  otherGoalsMonthlyRequired = 0,
  today: string = todayIso(),
): GoalAnalysis {
  const calculations = computeGoalCalculations(goal, today);
  const monthlyRequired = calculations.requiredMonthlySavings;

  const discretionary =
    snapshot.monthlyIncome > 0
      ? Math.max(0, snapshot.monthlyIncome - snapshot.monthlyExpenses)
      : snapshot.safeToSpendToday * 30;
  const monthlyAvailable = roundMoney(
    Math.max(0, Math.min(discretionary, snapshot.realAvailable) - otherGoalsMonthlyRequired),
  );

  let feasibility: GoalFeasibility = 'achievable';
  let message = `Your current financial situation suggests you can save approximately ₱${Math.round(monthlyAvailable)}/month toward this goal.`;
  let suggestedTargetDate: string | null = null;

  if (monthlyRequired <= 0) {
    feasibility = 'achievable';
    message = 'This goal is already complete or has no remaining target.';
  } else if (monthlyAvailable >= monthlyRequired * 1.1) {
    feasibility = 'achievable';
  } else if (monthlyAvailable >= monthlyRequired * 0.75) {
    feasibility = 'difficult';
    message = `Saving ₱${Math.round(monthlyRequired)}/month will be tight. You have about ₱${Math.round(monthlyAvailable)}/month available for savings.`;
  } else {
    feasibility = 'at_risk';
    message = `You currently have approximately ₱${Math.round(monthlyAvailable)}/month available for savings, while this goal requires ₱${Math.round(monthlyRequired)}/month.`;
    if (monthlyAvailable > 0) {
      const monthsNeeded = Math.ceil(calculations.remainingAmount / monthlyAvailable);
      suggestedTargetDate = addDays(today, monthsNeeded * 30);
      message += ` Suggested target date: ${formatMonthYear(suggestedTargetDate)}.`;
    }
  }

  return {
    feasibility,
    monthlyRequired,
    monthlyAvailable,
    message,
    suggestedTargetDate,
  };
}

export function computeSavingsAllocation(
  goals: SavingsGoal[],
  availableAmount: number,
  contributionsByGoal: Record<string, SavingsContribution[]>,
  today: string = todayIso(),
): SavingsAllocationRecommendation[] {
  const active = goals.filter((g) => !g.is_completed && !g.is_archived && !g.deleted_at);
  if (active.length === 0 || availableAmount <= 0) return [];

  const priorityWeight = { high: 3, medium: 2, low: 1 } as const;

  const scored = active.map((goal) => {
    const calculations = computeGoalCalculations(goal, today);
    const status = computeGoalStatus(goal, contributionsByGoal[goal.id] ?? [], today);
    const urgency =
      (goal.target_date ? 1 / Math.max(1, calculations.daysRemaining ?? 30) : 0.01) *
      priorityWeight[goal.priority];
    const statusWeight =
      status === 'at_risk' ? 3 : status === 'behind' ? 2 : status === 'on_track' ? 1 : 0.5;
    return { goal, score: urgency * statusWeight, calculations };
  });

  const totalScore = scored.reduce((sum, item) => sum + item.score, 0) || 1;
  return scored.map(({ goal, score, calculations }) => {
    const share = score / totalScore;
    const recommendedAmount = roundMoney(availableAmount * share);
    return {
      goalId: goal.id,
      goalName: goal.name,
      recommendedAmount,
      reason: `Priority ${goal.priority} · ${calculations.requiredDailySavings}/day needed`,
    };
  });
}

export function computeGoalsSummary(
  goals: SavingsGoal[],
  contributions: SavingsContribution[],
  today: string = todayIso(),
): GoalSummary {
  const active = goals.filter((g) => !g.deleted_at && !g.is_archived);
  const totalSaved = roundMoney(active.reduce((sum, g) => sum + g.current_amount, 0));
  const totalTargets = roundMoney(
    active.filter((g) => !g.is_completed).reduce((sum, g) => sum + g.target_amount, 0),
  );
  const totalRemaining = roundMoney(
    active.filter((g) => !g.is_completed).reduce((sum, g) => {
      const { remainingAmount } = computeGoalProgress(g.target_amount, g.current_amount);
      return sum + remainingAmount;
    }, 0),
  );
  const overallProgress =
    totalTargets > 0 ? roundMoney(Math.min(100, (totalSaved / totalTargets) * 100)) : 0;

  const monthPrefix = today.slice(0, 7);
  const monthlyContributions = roundMoney(
    contributions
      .filter((c) => !c.deleted_at && c.contribution_date.startsWith(monthPrefix))
      .reduce((sum, c) => sum + c.amount, 0),
  );

  return {
    activeGoals: active.filter((g) => !g.is_completed).length,
    totalSaved,
    totalTargets,
    totalRemaining,
    overallProgress,
    monthlyContributions,
  };
}

export function enrichSavingsGoal(
  goal: SavingsGoal,
  contributions: SavingsContribution[],
  milestones: GoalMilestone[],
  today: string = todayIso(),
): EnrichedSavingsGoal {
  const calculations = computeGoalCalculations(goal, today);
  const forecast = computeGoalForecast(goal, contributions, today);
  const status = computeGoalStatus(goal, contributions, today);
  const milestonesReached = milestones
    .filter((m) => !m.deleted_at)
    .map((m) => m.percentage)
    .sort((a, b) => a - b);

  return { goal, calculations, status, forecast, milestonesReached };
}

export type GoalSortOption = 'priority' | 'target_date' | 'progress' | 'updated';

export function sortGoals(
  goals: SavingsGoal[],
  sortBy: GoalSortOption,
  contributionsByGoal: Record<string, SavingsContribution[]>,
  today: string = todayIso(),
): SavingsGoal[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  return [...goals].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;

    switch (sortBy) {
      case 'priority':
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'target_date': {
        if (!a.target_date && !b.target_date) return 0;
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return a.target_date.localeCompare(b.target_date);
      }
      case 'progress': {
        const pa = computeGoalProgress(a.target_amount, a.current_amount).progressPercentage;
        const pb = computeGoalProgress(b.target_amount, b.current_amount).progressPercentage;
        return pb - pa;
      }
      case 'updated':
        return b.updated_at.localeCompare(a.updated_at);
      default:
        return 0;
    }
  });
}

export function goalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'on_track':
      return 'On Track';
    case 'behind':
      return 'Behind';
    case 'at_risk':
      return 'At Risk';
  }
}

export function goalFeasibilityLabel(feasibility: GoalFeasibility): string {
  switch (feasibility) {
    case 'achievable':
      return 'Achievable';
    case 'difficult':
      return 'Difficult';
    case 'at_risk':
      return 'At Risk';
  }
}

export function formatGoalStatusEmoji(status: GoalStatus): string {
  switch (status) {
    case 'completed':
      return '🎉';
    case 'on_track':
      return '🟢';
    case 'behind':
      return '🟡';
    case 'at_risk':
      return '🔴';
  }
}
