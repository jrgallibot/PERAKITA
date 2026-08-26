import type { PesoDashboardSnapshot } from './types';
import { formatCurrency } from '../constants/currency';

export interface NotificationPrefs {
  enabled: boolean;
  bills: boolean;
  loans: boolean;
  budget: boolean;
  safeToSpend: boolean;
  goals: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  bills: true,
  loans: true,
  budget: true,
  safeToSpend: true,
  goals: true,
};

export interface PesoNotificationAlert {
  id: string;
  kind: 'bill' | 'loan' | 'budget' | 'safe_to_spend' | 'forecast' | 'goal';
  title: string;
  body: string;
  dueDate?: string;
}

export interface GoalNotificationInput {
  id: string;
  name: string;
  status: 'on_track' | 'behind' | 'at_risk' | 'completed';
  progressPercentage: number;
  remainingAmount: number;
  targetDate: string | null;
  daysRemaining: number | null;
  requiredDaily: number;
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Build savings goal alerts from enriched goal metrics. */
export function buildGoalNotificationAlerts(
  goals: GoalNotificationInput[],
  prefs: NotificationPrefs,
): PesoNotificationAlert[] {
  if (!prefs.enabled || !prefs.goals) return [];

  const alerts: PesoNotificationAlert[] = [];

  for (const goal of goals) {
    if (goal.status === 'completed') {
      alerts.push({
        id: `goal-completed-${goal.id}`,
        kind: 'goal',
        title: 'Goal completed',
        body: `🎉 Congratulations! You completed your ${goal.name} savings goal.`,
      });
      continue;
    }

    for (const milestone of [25, 50, 75]) {
      const near = milestone - 5;
      if (goal.progressPercentage >= near && goal.progressPercentage < milestone) {
        alerts.push({
          id: `goal-milestone-near-${goal.id}-${milestone}`,
          kind: 'goal',
          title: 'Milestone approaching',
          body: `🎯 You are only ${formatCurrency(Math.max(0, goal.remainingAmount))} away from reaching ${milestone}% of your ${goal.name} goal.`,
        });
        break;
      }
    }

    if (goal.status === 'behind') {
      alerts.push({
        id: `goal-behind-${goal.id}`,
        kind: 'goal',
        title: 'Goal behind schedule',
        body: `⚠️ Your ${goal.name} goal is behind schedule. You need about ${formatCurrency(Math.ceil(goal.requiredDaily))}/day to stay on track.`,
      });
    } else if (goal.status === 'at_risk') {
      alerts.push({
        id: `goal-at-risk-${goal.id}`,
        kind: 'goal',
        title: 'Goal at risk',
        body: `⚠️ Your ${goal.name} goal may miss its target date. Consider increasing savings to ${formatCurrency(Math.ceil(goal.requiredDaily))}/day.`,
      });
    }

    if (goal.targetDate && goal.daysRemaining != null && goal.daysRemaining <= 14 && goal.daysRemaining >= 0) {
      alerts.push({
        id: `goal-date-${goal.id}`,
        kind: 'goal',
        title: 'Target date approaching',
        body: `Your ${goal.name} goal target date is in ${goal.daysRemaining} day${goal.daysRemaining === 1 ? '' : 's'}. ${formatCurrency(goal.remainingAmount)} remaining.`,
        dueDate: goal.targetDate,
      });
    }
  }

  return alerts;
}

/** Build in-app / push alert messages from a PESO snapshot and user prefs. */
export function buildPesoNotificationAlerts(
  snapshot: PesoDashboardSnapshot,
  prefs: NotificationPrefs,
  budgetRows?: Array<{ id: string; name: string; percent: number }>,
  goalRows?: GoalNotificationInput[],
): PesoNotificationAlert[] {
  if (!prefs.enabled) return [];

  const alerts: PesoNotificationAlert[] = [];

  if (prefs.safeToSpend) {
    alerts.push({
      id: 'safe-to-spend-today',
      kind: 'safe_to_spend',
      title: 'Safe to spend today',
      body: `You can safely spend ${formatCurrency(snapshot.safeToSpendToday)} today.`,
    });
  }

  if (prefs.bills || prefs.loans) {
    for (const bill of snapshot.upcomingBills) {
      const isLoan = bill.source === 'loan';
      if (isLoan && !prefs.loans) continue;
      if (!isLoan && !prefs.bills) continue;
      const days = daysUntil(bill.due_date);
      if (days < 0 || days > 7) continue;
      const when =
        days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due in ${days} days`;
      alerts.push({
        id: `${bill.source}-${bill.id}-${bill.due_date}`,
        kind: isLoan ? 'loan' : 'bill',
        title: isLoan ? 'Loan payment reminder' : 'Bill reminder',
        body: `${bill.name} (${formatCurrency(bill.amount)}) is ${when}.`,
        dueDate: bill.due_date,
      });
    }
  }

  if (prefs.budget && budgetRows) {
    for (const budget of budgetRows) {
      if (budget.percent < 85) continue;
      alerts.push({
        id: `budget-${budget.id}`,
        kind: 'budget',
        title: 'Budget warning',
        body: `You have used ${budget.percent}% of your ${budget.name} budget.`,
      });
    }
  }

  if (snapshot.forecast.runsOutBeforePayday && snapshot.forecast.warning) {
    alerts.push({
      id: 'forecast-warning',
      kind: 'forecast',
      title: 'Balance forecast',
      body: snapshot.forecast.warning,
    });
  }

  if (goalRows?.length) {
    alerts.push(...buildGoalNotificationAlerts(goalRows, prefs));
  }

  return alerts;
}

/** Schedule trigger date: morning reminder one day before due date. */
export function billReminderTriggerDate(dueDate: string): Date | null {
  const due = new Date(`${dueDate}T09:00:00`);
  const reminder = new Date(due);
  reminder.setDate(reminder.getDate() - 1);
  if (reminder.getTime() <= Date.now()) return null;
  return reminder;
}
