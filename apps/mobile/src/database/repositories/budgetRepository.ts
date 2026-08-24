import type { Budget, BudgetCategory } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';

export type BudgetWithProgress = Budget & {
  spent: number;
  percent: number;
  categories: Array<BudgetCategory & { name: string; color: string | null; spent: number }>;
};

function mapBudget(row: Record<string, unknown>): Budget {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    period_start: row.period_start as string,
    period_end: row.period_end as string,
    total_amount: row.total_amount as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as Budget['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

export const budgetRepository = {
  async findAllWithProgress(userId: string): Promise<BudgetWithProgress[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM budgets WHERE user_id = ? AND deleted_at IS NULL ORDER BY period_start DESC`,
      [userId]
    );

    const budgets: BudgetWithProgress[] = [];
    for (const row of rows) {
      const budget = mapBudget(row);
      const spentRow = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE user_id = ? AND deleted_at IS NULL
           AND type IN ('expense', 'adjustment')
           AND budget_id = ?`,
        [userId, budget.id]
      );
      const spent = spentRow?.total ?? 0;
      const cats = await db.getAllAsync<Record<string, unknown>>(
        `SELECT bc.*, c.name as name, c.color as color,
           (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
            WHERE t.user_id = bc.user_id AND t.deleted_at IS NULL
              AND t.type IN ('expense', 'adjustment')
              AND t.budget_id = bc.budget_id
              AND t.category_id = bc.category_id) as spent
         FROM budget_categories bc
         LEFT JOIN categories c ON c.id = bc.category_id
         WHERE bc.budget_id = ? AND bc.deleted_at IS NULL`,
        [budget.id]
      );
      budgets.push({
        ...budget,
        spent,
        percent: budget.total_amount > 0 ? Math.round((spent / budget.total_amount) * 100) : 0,
        categories: cats.map((cat) => ({
          id: cat.id as string,
          user_id: cat.user_id as string,
          budget_id: cat.budget_id as string,
          category_id: cat.category_id as string,
          limit_amount: cat.limit_amount as number,
          created_at: cat.created_at as string,
          updated_at: cat.updated_at as string,
          deleted_at: (cat.deleted_at as string) ?? null,
          sync_status: cat.sync_status as BudgetCategory['sync_status'],
          last_synced_at: (cat.last_synced_at as string) ?? null,
          device_id: (cat.device_id as string) ?? null,
          version: cat.version as number,
          name: (cat.name as string) ?? 'Category',
          color: (cat.color as string) ?? null,
          spent: Number(cat.spent ?? 0),
        })),
      });
    }
    return budgets;
  },

  /** Budgets whose period covers the given ISO date (for expense budget picker). */
  async findActiveForDate(userId: string, date: string): Promise<Budget[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM budgets
       WHERE user_id = ? AND deleted_at IS NULL
         AND period_start <= ? AND period_end >= ?
       ORDER BY name COLLATE NOCASE ASC`,
      [userId, date, date]
    );
    return rows.map(mapBudget);
  },

  async create(
    userId: string,
    data: { name: string; period_start: string; period_end: string; total_amount: number }
  ): Promise<Budget> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    await db.runAsync(
      `INSERT INTO budgets (
        id, user_id, name, period_start, period_end, total_amount,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        data.name,
        data.period_start,
        data.period_end,
        data.total_amount,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );
    const budget: Budget = {
      id,
      user_id: userId,
      name: data.name,
      period_start: data.period_start,
      period_end: data.period_end,
      total_amount: data.total_amount,
      created_at: now,
      updated_at: now,
      ...sync,
    };
    await enqueueSync('budgets', id, 'CREATE', budget as unknown as Record<string, unknown>);
    return budget;
  },

  async addCategory(userId: string, budgetId: string, categoryId: string, limitAmount: number) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM budget_categories WHERE budget_id = ? AND category_id = ? AND deleted_at IS NULL`,
      [budgetId, categoryId]
    );
    if (existing) throw new Error('This category already has a limit in this budget.');
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    await db.runAsync(
      `INSERT INTO budget_categories (
        id, user_id, budget_id, category_id, limit_amount,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        budgetId,
        categoryId,
        limitAmount,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );
    await enqueueSync('budget_categories', id, 'CREATE', {
      id,
      user_id: userId,
      budget_id: budgetId,
      category_id: categoryId,
      limit_amount: limitAmount,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
      version: 1,
    });
  },

  async update(
    userId: string,
    budgetId: string,
    data: { name?: string; total_amount?: number; period_start?: string; period_end?: string }
  ): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM budgets WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [budgetId, userId]
    );
    if (!existing) throw new Error('Budget not found');
    const now = nowIso();
    const name = data.name ?? (existing.name as string);
    const total = data.total_amount ?? (existing.total_amount as number);
    const start = data.period_start ?? (existing.period_start as string);
    const end = data.period_end ?? (existing.period_end as string);
    await db.runAsync(
      `UPDATE budgets SET name = ?, total_amount = ?, period_start = ?, period_end = ?,
       updated_at = ?, sync_status = 'updated', version = version + 1 WHERE id = ?`,
      [name, total, start, end, now, budgetId]
    );
    await enqueueSync('budgets', budgetId, 'UPDATE', {
      ...mapBudget(existing),
      name,
      total_amount: total,
      period_start: start,
      period_end: end,
    } as unknown as Record<string, unknown>);
  },

  async softDelete(userId: string, budgetId: string): Promise<void> {
    const db = await getDatabase();
    const now = nowIso();
    await db.runAsync(
      `UPDATE budgets SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1
       WHERE id = ? AND user_id = ?`,
      [now, now, budgetId, userId]
    );
    await enqueueSync('budgets', budgetId, 'DELETE', { id: budgetId, deleted_at: now });
  },
};
