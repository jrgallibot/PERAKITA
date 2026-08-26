import type { SavingsGoal, SavingsContribution } from '@perakita/shared';
import {
  computeGoalsSummary,
  enrichSavingsGoal,
  sortGoals,
  type GoalSortOption,
} from '@perakita/shared';
import { savingsGoalRepository } from '@/database/repositories/savingsGoalRepository';

export async function loadGoalsDashboard(userId: string, sortBy: GoalSortOption = 'target_date') {
  const [goals, contributions] = await Promise.all([
    savingsGoalRepository.findAll(userId),
    savingsGoalRepository.findAllContributions(userId),
  ]);

  const contributionsByGoal: Record<string, SavingsContribution[]> = {};
  for (const contribution of contributions) {
    if (!contributionsByGoal[contribution.goal_id]) {
      contributionsByGoal[contribution.goal_id] = [];
    }
    contributionsByGoal[contribution.goal_id].push(contribution);
  }

  const sorted = sortGoals(goals, sortBy, contributionsByGoal);
  const summary = computeGoalsSummary(goals, contributions);
  const enriched = await Promise.all(
    sorted.map(async (goal) => {
      const goalContributions = contributionsByGoal[goal.id] ?? [];
      const milestones = await savingsGoalRepository.findMilestones(userId, goal.id);
      return enrichSavingsGoal(goal, goalContributions, milestones);
    }),
  );

  return { goals: sorted, enriched, summary, contributionsByGoal };
}

export async function loadGoalDetail(userId: string, goalId: string) {
  const goal = await savingsGoalRepository.findById(userId, goalId);
  if (!goal) return null;

  const [contributions, milestones, allGoals, allContributions] = await Promise.all([
    savingsGoalRepository.findContributions(userId, goalId),
    savingsGoalRepository.findMilestones(userId, goalId),
    savingsGoalRepository.findAll(userId),
    savingsGoalRepository.findAllContributions(userId),
  ]);

  const enriched = enrichSavingsGoal(goal, contributions, milestones);
  const contributionsByGoal: Record<string, SavingsContribution[]> = {};
  for (const c of allContributions) {
    if (!contributionsByGoal[c.goal_id]) contributionsByGoal[c.goal_id] = [];
    contributionsByGoal[c.goal_id].push(c);
  }

  return { enriched, contributions, milestones, allGoals, contributionsByGoal };
}

export type { SavingsGoal, SavingsContribution, GoalSortOption };
