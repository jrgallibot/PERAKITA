import {
  computeEmergencyFundSummary,
  computeGoalsSummary,
  detectNewMilestones,
  emergencyFundSchema,
  milestoneMessage,
  savingsContributionSchema,
  savingsGoalSchema,
  todayIso,
  type EmergencyFundSummary,
  type EmergencyFundTarget,
  type GoalMilestone,
  type SavingsContribution,
  type SavingsGoal,
  type SavingsGoalInput,
  type SavingsContributionInput,
} from '@perakita/shared';
import { supabase } from '@/lib/supabase';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function loadWebSavingsDashboard(userId: string) {
  const [goalsRes, contribRes, milestonesRes] = await Promise.all([
    supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('target_date', { ascending: true }),
    supabase
      .from('savings_contributions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('contribution_date', { ascending: false }),
    supabase
      .from('goal_milestones')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null),
  ]);
  if (goalsRes.error) throw goalsRes.error;
  if (contribRes.error) throw contribRes.error;
  if (milestonesRes.error) throw milestonesRes.error;

  const goals = ((goalsRes.data ?? []) as SavingsGoal[]).map((goal) => ({
    ...goal,
    target_amount: num(goal.target_amount),
    current_amount: num(goal.current_amount),
  }));
  const contributions = ((contribRes.data ?? []) as SavingsContribution[]).map((contribution) => ({
    ...contribution,
    amount: num(contribution.amount),
  }));
  const milestones = (milestonesRes.data ?? []) as GoalMilestone[];

  const contributionsByGoal: Record<string, SavingsContribution[]> = {};
  const milestonesByGoal: Record<string, GoalMilestone[]> = {};
  for (const contribution of contributions) {
    if (!contributionsByGoal[contribution.goal_id]) contributionsByGoal[contribution.goal_id] = [];
    contributionsByGoal[contribution.goal_id].push(contribution);
  }
  for (const milestone of milestones) {
    if (!milestonesByGoal[milestone.goal_id]) milestonesByGoal[milestone.goal_id] = [];
    milestonesByGoal[milestone.goal_id].push(milestone);
  }

  return {
    goals,
    contributions,
    milestones,
    contributionsByGoal,
    milestonesByGoal,
    summary: computeGoalsSummary(goals, contributions),
  };
}

export async function createWebSavingsGoal(userId: string, input: SavingsGoalInput): Promise<void> {
  const parsed = savingsGoalSchema.parse(input);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const startingAmount = parsed.current_amount;
  const isCompleted = startingAmount >= parsed.target_amount;
  const { error } = await supabase.from('savings_goals').insert({
    id,
    user_id: userId,
    ...parsed,
    current_amount: startingAmount > 0 ? 0 : parsed.current_amount,
    target_date: parsed.target_date ?? null,
    description: parsed.description ?? null,
    is_completed: isCompleted,
    is_archived: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    last_synced_at: now,
    version: 1,
  });
  if (error) throw error;

  if (startingAmount > 0) {
    await addWebSavingsContribution(userId, {
      goal_id: id,
      amount: startingAmount,
      contribution_date: todayIso(),
      source: 'Starting amount',
      notes: 'Starting amount when goal was created',
    });
  }
}

export async function addWebSavingsContribution(
  userId: string,
  input: SavingsContributionInput,
): Promise<string[]> {
  const parsed = savingsContributionSchema.parse(input);
  const now = new Date().toISOString();
  const [{ data: goal, error: goalError }, { data: existingMilestones, error: milestoneError }] =
    await Promise.all([
      supabase
        .from('savings_goals')
        .select('*')
        .eq('id', parsed.goal_id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', parsed.goal_id)
        .eq('user_id', userId)
        .is('deleted_at', null),
    ]);
  if (goalError || !goal) throw goalError ?? new Error('Goal not found');
  if (milestoneError) throw milestoneError;

  const { error: contributionError } = await supabase.from('savings_contributions').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    goal_id: parsed.goal_id,
    amount: parsed.amount,
    contribution_date: parsed.contribution_date,
    source: parsed.source ?? null,
    notes: parsed.notes ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    last_synced_at: now,
    version: 1,
  });
  if (contributionError) throw contributionError;

  const currentAmount = num(goal.current_amount) + parsed.amount;
  const targetAmount = num(goal.target_amount);
  const progress = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
  const newMilestones = detectNewMilestones(progress, (existingMilestones ?? []) as GoalMilestone[]);

  const { error: updateError } = await supabase
    .from('savings_goals')
    .update({
      current_amount: currentAmount,
      is_completed: currentAmount >= targetAmount,
      updated_at: now,
      sync_status: 'updated',
      last_synced_at: now,
      version: num(goal.version) + 1,
    })
    .eq('id', parsed.goal_id)
    .eq('user_id', userId);
  if (updateError) throw updateError;

  if (newMilestones.length > 0) {
    const { error } = await supabase.from('goal_milestones').insert(
      newMilestones.map((percentage) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        goal_id: parsed.goal_id,
        percentage,
        reached_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        sync_status: 'synced',
        last_synced_at: now,
        version: 1,
      })),
    );
    if (error) throw error;
  }

  return newMilestones.map((percentage) => milestoneMessage(String(goal.name ?? 'Savings goal'), percentage));
}

export async function loadWebEmergencyFund(userId: string): Promise<{
  fund: EmergencyFundTarget | null;
  summary: EmergencyFundSummary;
}> {
  const [fundRes, monthTxRes] = await Promise.all([
    supabase
      .from('emergency_fund_targets')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .is('deleted_at', null)
      .gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
      .lte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)),
  ]);
  if (fundRes.error) throw fundRes.error;
  if (monthTxRes.error) throw monthTxRes.error;
  const monthlyEssentials = (monthTxRes.data ?? []).reduce((sum, tx) => sum + num(tx.amount), 0) * 0.6;
  const fund = fundRes.data
    ? ({
        ...(fundRes.data as EmergencyFundTarget),
        target_amount: num(fundRes.data.target_amount),
        current_amount: num(fundRes.data.current_amount),
        recommended_target: fundRes.data.recommended_target == null ? null : num(fundRes.data.recommended_target),
      } as EmergencyFundTarget)
    : null;
  return {
    fund,
    summary: computeEmergencyFundSummary({
      targetAmount: fund?.target_amount,
      currentAmount: fund?.current_amount,
      recommendedTarget: fund?.recommended_target,
      monthlyEssentials,
    }),
  };
}

export async function upsertWebEmergencyFund(
  userId: string,
  input: { target_amount: number; current_amount: number; recommended_target?: number | null },
): Promise<void> {
  const parsed = emergencyFundSchema.parse(input);
  const now = new Date().toISOString();
  const { data: existing, error: findError } = await supabase
    .from('emergency_fund_targets')
    .select('id, version')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (findError) throw findError;

  const row = {
    user_id: userId,
    target_amount: parsed.target_amount,
    current_amount: parsed.current_amount,
    recommended_target: input.recommended_target ?? null,
    updated_at: now,
    sync_status: existing?.id ? 'updated' : 'synced',
    last_synced_at: now,
    version: existing?.version ? num(existing.version) + 1 : 1,
  };

  if (existing?.id) {
    const { error } = await supabase.from('emergency_fund_targets').update(row).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('emergency_fund_targets').insert({
    id: crypto.randomUUID(),
    ...row,
    created_at: now,
    deleted_at: null,
  });
  if (error) throw error;
}
