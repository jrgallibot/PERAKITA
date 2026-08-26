import { describe, expect, it } from 'vitest';
import {
  computeGoalCalculations,
  computeGoalForecast,
  computeGoalProgress,
  computeGoalStatus,
  computeGoalsSummary,
} from './savingsGoals';
import type { SavingsContribution, SavingsGoal } from './types';

const baseGoal: SavingsGoal = {
  id: 'g1',
  user_id: 'u1',
  name: 'New Phone',
  category: 'phone',
  icon: 'phone-portrait-outline',
  target_amount: 20000,
  current_amount: 6500,
  target_date: '2026-12-25',
  priority: 'high',
  description: null,
  is_completed: false,
  is_archived: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  sync_status: 'synced',
  last_synced_at: null,
  device_id: null,
  version: 1,
};

describe('savings goal calculations', () => {
  it('computes remaining amount and progress', () => {
    const result = computeGoalProgress(20000, 6500);
    expect(result.remainingAmount).toBe(13500);
    expect(result.progressPercentage).toBe(32.5);
  });

  it('computes daily requirement for spec scenario', () => {
    const goal = { ...baseGoal, target_date: '2026-12-24' };
    const calculations = computeGoalCalculations(goal, '2026-08-26');
    expect(calculations.daysRemaining).toBe(120);
    expect(calculations.requiredDailySavings).toBe(112.5);
    expect(Math.ceil(calculations.requiredDailySavings)).toBe(113);
  });

  it('marks completed goals', () => {
    const completed = { ...baseGoal, current_amount: 20000 };
    const status = computeGoalStatus(completed, [], '2026-08-26');
    expect(status).toBe('completed');
  });

  it('detects behind schedule from contribution history', () => {
    const contributions: SavingsContribution[] = [
      {
        id: 'c1',
        user_id: 'u1',
        goal_id: 'g1',
        amount: 70,
        contribution_date: '2026-08-20',
        source: 'Salary',
        notes: null,
        created_at: '2026-08-20T00:00:00.000Z',
        updated_at: '2026-08-20T00:00:00.000Z',
        deleted_at: null,
        sync_status: 'synced',
        last_synced_at: null,
        device_id: null,
        version: 1,
      },
      {
        id: 'c2',
        user_id: 'u1',
        goal_id: 'g1',
        amount: 70,
        contribution_date: '2026-08-13',
        source: 'Salary',
        notes: null,
        created_at: '2026-08-13T00:00:00.000Z',
        updated_at: '2026-08-13T00:00:00.000Z',
        deleted_at: null,
        sync_status: 'synced',
        last_synced_at: null,
        device_id: null,
        version: 1,
      },
    ];
    const status = computeGoalStatus(baseGoal, contributions, '2026-08-26');
    expect(['behind', 'at_risk']).toContain(status);
  });

  it('summarizes multiple goals', () => {
    const goals: SavingsGoal[] = [
      baseGoal,
      { ...baseGoal, id: 'g2', name: 'Laptop', target_amount: 50000, current_amount: 15000 },
    ];
    const summary = computeGoalsSummary(goals, []);
    expect(summary.totalSaved).toBe(21500);
    expect(summary.totalTargets).toBe(70000);
  });

  it('handles forecast without enough history', () => {
    const forecast = computeGoalForecast(baseGoal, [], '2026-08-26');
    expect(forecast.hasReliableHistory).toBe(false);
    expect(forecast.forecastMessage).toContain('Not enough savings history');
  });
});
