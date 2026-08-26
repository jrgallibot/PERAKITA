import type { SyncMetadata } from '../types/index';

export type IncomeFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export type SavingsGoalPriority = 'low' | 'medium' | 'high';

export type SavingsGoalCategory =
  | 'emergency_fund'
  | 'phone'
  | 'laptop'
  | 'vacation'
  | 'tuition'
  | 'wedding'
  | 'house'
  | 'motorcycle'
  | 'car'
  | 'business'
  | 'other';

export type GoalStatus = 'on_track' | 'behind' | 'at_risk' | 'completed';

export type GoalFeasibility = 'achievable' | 'difficult' | 'at_risk';

export type AchievementCode =
  | 'first_expense'
  | 'first_1000_saved'
  | 'seven_days_under_budget'
  | 'debt_paid_on_time'
  | 'goal_completed'
  | 'reduced_spending';

export interface FinancialProfile extends SyncMetadata {
  id: string;
  user_id: string;
  currency: string;
  current_money: number;
  income_source: string | null;
  income_amount: number;
  income_frequency: IncomeFrequency;
  next_payday: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringExpense extends SyncMetadata {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id: string | null;
  frequency: RecurringFrequency;
  custom_interval_days: number | null;
  next_due_date: string;
  payment_method: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal extends SyncMetadata {
  id: string;
  user_id: string;
  name: string;
  category: SavingsGoalCategory;
  icon: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  priority: SavingsGoalPriority;
  description: string | null;
  is_completed: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsContribution extends SyncMetadata {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  contribution_date: string;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone extends SyncMetadata {
  id: string;
  user_id: string;
  goal_id: string;
  percentage: number;
  reached_at: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyFundTarget extends SyncMetadata {
  id: string;
  user_id: string;
  target_amount: number;
  current_amount: number;
  recommended_target: number | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  code: AchievementCode;
  title: string;
  description: string;
  icon: string;
}

export interface UserAchievement extends SyncMetadata {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  source: 'recurring' | 'loan';
}

export interface HealthScoreBreakdown {
  score: number;
  strong: string[];
  needsImprovement: string[];
}

export interface SavingsPaceResult {
  remaining: number;
  daysLeft: number;
  daily: number;
  weekly: number;
  monthly: number;
}

export interface ForecastResult {
  projectedBalance: number;
  projectedSpending: number;
  daysUntilZero: number | null;
  runsOutBeforePayday: boolean;
  daysBeforePaydayShort: number | null;
  warning: string | null;
}

export interface SpendingRiskResult {
  detected: boolean;
  severity: 'none' | 'moderate' | 'high';
  message: string | null;
}

export interface PesoDashboardSnapshot {
  currentBalance: number;
  realAvailable: number;
  safeToSpendToday: number;
  daysUntilPayday: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSavings: number;
  totalDebt: number;
  healthScore: HealthScoreBreakdown;
  upcomingBills: UpcomingBill[];
  forecast: ForecastResult;
  spendingRisk: SpendingRiskResult;
  avgDailySpend: number;
  plannedSavings: number;
  upcomingCommitments: number;
}

export const PESO_AI_DISCLAIMER =
  'Educational insights based on your recorded data. Not professional financial advice.';

export const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'id'>[] = [
  {
    code: 'first_expense',
    title: 'First Expense',
    description: 'Recorded your first expense',
    icon: 'receipt',
  },
  {
    code: 'first_1000_saved',
    title: 'First ₱1,000 Saved',
    description: 'Saved at least ₱1,000 toward a goal',
    icon: 'wallet',
  },
  {
    code: 'seven_days_under_budget',
    title: '7 Days Under Budget',
    description: 'Stayed under budget for 7 days',
    icon: 'checkmark-circle',
  },
  {
    code: 'debt_paid_on_time',
    title: 'Paid Debt On Time',
    description: 'Made a debt payment on time',
    icon: 'hand-left',
  },
  {
    code: 'goal_completed',
    title: 'Completed Savings Goal',
    description: 'Reached a savings goal',
    icon: 'trophy',
  },
  {
    code: 'reduced_spending',
    title: 'Reduced Spending',
    description: 'Spending dropped below your average',
    icon: 'trending-down',
  },
];
