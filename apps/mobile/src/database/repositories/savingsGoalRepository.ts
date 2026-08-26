import type {
  GoalMilestone,
  SavingsContribution,
  SavingsGoal,
  SavingsGoalCategory,
  SavingsGoalPriority,
} from '@perakita/shared';
import {
  detectNewMilestones,
  milestoneMessage,
} from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';
import { achievementRepository } from './achievementRepository';

function mapGoal(row: Record<string, unknown>): SavingsGoal {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    category: (row.category as SavingsGoalCategory) ?? 'other',
    icon: (row.icon as string) ?? 'flag-outline',
    target_amount: row.target_amount as number,
    current_amount: row.current_amount as number,
    target_date: (row.target_date as string) ?? null,
    priority: row.priority as SavingsGoalPriority,
    description: (row.description as string) ?? null,
    is_completed: Boolean(row.is_completed),
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as SavingsGoal['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

function mapContribution(row: Record<string, unknown>): SavingsContribution {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    goal_id: row.goal_id as string,
    amount: row.amount as number,
    contribution_date: row.contribution_date as string,
    source: (row.source as string) ?? null,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as SavingsContribution['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

function mapMilestone(row: Record<string, unknown>): GoalMilestone {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    goal_id: row.goal_id as string,
    percentage: row.percentage as number,
    reached_at: row.reached_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as GoalMilestone['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

async function recalculateGoalAmount(
  userId: string,
  goalId: string,
): Promise<SavingsGoal> {
  const db = await getDatabase();
  const goal = await savingsGoalRepository.findById(userId, goalId);
  if (!goal) throw new Error('Goal not found');

  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM savings_contributions
     WHERE goal_id = ? AND user_id = ? AND deleted_at IS NULL`,
    [goalId, userId],
  );
  const currentAmount = row?.total ?? 0;
  const completed = currentAmount >= goal.target_amount;
  const now = nowIso();

  await db.runAsync(
    `UPDATE savings_goals SET current_amount = ?, is_completed = ?, updated_at = ?,
     sync_status = 'updated', version = version + 1 WHERE id = ? AND user_id = ?`,
    [currentAmount, completed ? 1 : 0, now, goalId, userId],
  );

  const updated = { ...goal, current_amount: currentAmount, is_completed: completed, updated_at: now };
  await enqueueSync('savings_goals', goalId, 'UPDATE', updated as unknown as Record<string, unknown>);

  if (completed) {
    await achievementRepository.unlock(userId, 'goal_completed');
  }

  return updated;
}

async function recordMilestones(
  userId: string,
  goal: SavingsGoal,
  progressPercentage: number,
): Promise<GoalMilestone[]> {
  const existing = await savingsGoalRepository.findMilestones(userId, goal.id);
  const newPercentages = detectNewMilestones(progressPercentage, existing);
  if (newPercentages.length === 0) return [];

  const db = await getDatabase();
  const now = nowIso();
  const created: GoalMilestone[] = [];

  for (const percentage of newPercentages) {
    const id = newId();
    const sync = createSyncFields('pending');
    const milestone: GoalMilestone = {
      id,
      user_id: userId,
      goal_id: goal.id,
      percentage,
      reached_at: now,
      created_at: now,
      updated_at: now,
      ...sync,
    };
    await db.runAsync(
      `INSERT INTO goal_milestones (
        id, user_id, goal_id, percentage, reached_at,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        goal.id,
        percentage,
        now,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ],
    );
    await enqueueSync('goal_milestones', id, 'CREATE', milestone as unknown as Record<string, unknown>);
    created.push(milestone);
    if (percentage >= 100) {
      await achievementRepository.unlock(userId, 'goal_completed');
    }
  }

  return created;
}

export const savingsGoalRepository = {
  async findAll(userId: string, includeArchived = false): Promise<SavingsGoal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      includeArchived
        ? `SELECT * FROM savings_goals WHERE user_id = ? AND deleted_at IS NULL
           ORDER BY is_completed ASC, is_archived ASC, target_date ASC`
        : `SELECT * FROM savings_goals WHERE user_id = ? AND deleted_at IS NULL AND is_archived = 0
           ORDER BY is_completed ASC, target_date ASC`,
      [userId],
    );
    return rows.map(mapGoal);
  },

  async findById(userId: string, id: string): Promise<SavingsGoal | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM savings_goals WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      [userId, id],
    );
    return row ? mapGoal(row) : null;
  },

  async getTotalSaved(userId: string): Promise<number> {
    const goals = await this.findAll(userId);
    return goals.reduce((sum, g) => sum + g.current_amount, 0);
  },

  async findContributions(userId: string, goalId: string): Promise<SavingsContribution[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM savings_contributions
       WHERE user_id = ? AND goal_id = ? AND deleted_at IS NULL
       ORDER BY contribution_date DESC, created_at DESC`,
      [userId, goalId],
    );
    return rows.map(mapContribution);
  },

  async findAllContributions(userId: string): Promise<SavingsContribution[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM savings_contributions
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY contribution_date DESC`,
      [userId],
    );
    return rows.map(mapContribution);
  },

  async findMilestones(userId: string, goalId: string): Promise<GoalMilestone[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM goal_milestones WHERE user_id = ? AND goal_id = ? AND deleted_at IS NULL`,
      [userId, goalId],
    );
    return rows.map(mapMilestone);
  },

  async create(
    userId: string,
    data: {
      name: string;
      category: SavingsGoalCategory;
      icon?: string;
      target_amount: number;
      current_amount?: number;
      target_date?: string | null;
      priority?: SavingsGoalPriority;
      description?: string | null;
    },
  ): Promise<SavingsGoal> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    const currentAmount = data.current_amount ?? 0;
    const completed = currentAmount >= data.target_amount;
    const goal: SavingsGoal = {
      id,
      user_id: userId,
      name: data.name,
      category: data.category,
      icon: data.icon ?? 'flag-outline',
      target_amount: data.target_amount,
      current_amount: currentAmount,
      target_date: data.target_date ?? null,
      priority: data.priority ?? 'medium',
      description: data.description ?? null,
      is_completed: completed,
      is_archived: false,
      created_at: now,
      updated_at: now,
      ...sync,
    };
    await db.runAsync(
      `INSERT INTO savings_goals (
        id, user_id, name, category, icon, target_amount, current_amount, target_date,
        priority, description, is_completed, is_archived,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        goal.name,
        goal.category,
        goal.icon,
        goal.target_amount,
        goal.current_amount,
        goal.target_date,
        goal.priority,
        goal.description,
        completed ? 1 : 0,
        0,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ],
    );
    await enqueueSync('savings_goals', id, 'CREATE', goal as unknown as Record<string, unknown>);

    if (currentAmount > 0) {
      await this.addContribution(userId, id, {
        amount: currentAmount,
        contribution_date: now.slice(0, 10),
        source: 'Initial balance',
        notes: 'Starting amount when goal was created',
      });
    }

    return goal;
  },

  async update(
    userId: string,
    id: string,
    data: Partial<{
      name: string;
      category: SavingsGoalCategory;
      icon: string;
      target_amount: number;
      target_date: string | null;
      priority: SavingsGoalPriority;
      description: string | null;
      is_archived: boolean;
    }>,
  ): Promise<SavingsGoal> {
    const db = await getDatabase();
    const existing = await this.findById(userId, id);
    if (!existing) throw new Error('Goal not found');

    const now = nowIso();
    const updated: SavingsGoal = {
      ...existing,
      ...data,
      is_completed: existing.current_amount >= (data.target_amount ?? existing.target_amount),
      updated_at: now,
      sync_status: 'updated',
      version: existing.version + 1,
    };

    await db.runAsync(
      `UPDATE savings_goals SET
        name = ?, category = ?, icon = ?, target_amount = ?, target_date = ?,
        priority = ?, description = ?, is_completed = ?, is_archived = ?,
        updated_at = ?, sync_status = 'updated', version = version + 1
       WHERE id = ? AND user_id = ?`,
      [
        updated.name,
        updated.category,
        updated.icon,
        updated.target_amount,
        updated.target_date,
        updated.priority,
        updated.description,
        updated.is_completed ? 1 : 0,
        updated.is_archived ? 1 : 0,
        now,
        id,
        userId,
      ],
    );
    await enqueueSync('savings_goals', id, 'UPDATE', updated as unknown as Record<string, unknown>);
    return updated;
  },

  async addContribution(
    userId: string,
    goalId: string,
    data: {
      amount: number;
      contribution_date: string;
      source?: string | null;
      notes?: string | null;
    },
  ): Promise<{ contribution: SavingsContribution; goal: SavingsGoal; milestones: GoalMilestone[] }> {
    const db = await getDatabase();
    const goal = await this.findById(userId, goalId);
    if (!goal) throw new Error('Goal not found');

    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    const contribution: SavingsContribution = {
      id,
      user_id: userId,
      goal_id: goalId,
      amount: data.amount,
      contribution_date: data.contribution_date,
      source: data.source ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
      ...sync,
    };

    await db.runAsync(
      `INSERT INTO savings_contributions (
        id, user_id, goal_id, amount, contribution_date, source, notes,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        goalId,
        data.amount,
        data.contribution_date,
        data.source ?? null,
        data.notes ?? null,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ],
    );
    await enqueueSync('savings_contributions', id, 'CREATE', contribution as unknown as Record<string, unknown>);

    const updatedGoal = await recalculateGoalAmount(userId, goalId);
    const progress =
      updatedGoal.target_amount > 0
        ? (updatedGoal.current_amount / updatedGoal.target_amount) * 100
        : 0;
    const milestones = await recordMilestones(userId, updatedGoal, progress);

    return { contribution, goal: updatedGoal, milestones };
  },

  async updateContribution(
    userId: string,
    contributionId: string,
    data: Partial<{
      amount: number;
      contribution_date: string;
      source: string | null;
      notes: string | null;
    }>,
  ): Promise<SavingsContribution> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM savings_contributions WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [contributionId, userId],
    );
    if (!row) throw new Error('Contribution not found');
    const existing = mapContribution(row);
    const now = nowIso();
    const updated: SavingsContribution = {
      ...existing,
      amount: data.amount ?? existing.amount,
      contribution_date: data.contribution_date ?? existing.contribution_date,
      source: data.source !== undefined ? data.source : existing.source,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updated_at: now,
      sync_status: 'updated',
      version: existing.version + 1,
    };

    await db.runAsync(
      `UPDATE savings_contributions SET amount = ?, contribution_date = ?, source = ?, notes = ?,
       updated_at = ?, sync_status = 'updated', version = version + 1 WHERE id = ?`,
      [
        updated.amount,
        updated.contribution_date,
        updated.source,
        updated.notes,
        now,
        contributionId,
      ],
    );
    await enqueueSync(
      'savings_contributions',
      contributionId,
      'UPDATE',
      updated as unknown as Record<string, unknown>,
    );
    await recalculateGoalAmount(userId, existing.goal_id);
    return updated;
  },

  async deleteContribution(userId: string, contributionId: string): Promise<void> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM savings_contributions WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [contributionId, userId],
    );
    if (!row) throw new Error('Contribution not found');
    const existing = mapContribution(row);
    const now = nowIso();
    await db.runAsync(
      `UPDATE savings_contributions SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1
       WHERE id = ?`,
      [now, now, contributionId],
    );
    await enqueueSync('savings_contributions', contributionId, 'DELETE', {
      id: contributionId,
      deleted_at: now,
    });
    await recalculateGoalAmount(userId, existing.goal_id);
  },

  async softDelete(userId: string, id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowIso();
    await db.runAsync(
      `UPDATE savings_goals SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1
       WHERE id = ? AND user_id = ?`,
      [now, now, id, userId],
    );
    await enqueueSync('savings_goals', id, 'DELETE', { id, deleted_at: now });
  },

  milestoneMessage,
};

export { mapGoal, mapContribution, mapMilestone };
