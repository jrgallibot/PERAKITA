import type { Transaction, TransactionType } from '@perakita/shared';
import { buildDailyTrend, buildSpendingBreakdown, type DailyTrendPoint } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';
import { accountRepository } from './accountRepository';

export type TransactionRow = Transaction & {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  account_name: string | null;
};

export type SpendingSlice = {
  name: string;
  color: string;
  total: number;
  percent: number;
};

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    account_id: row.account_id as string,
    category_id: (row.category_id as string) ?? null,
    budget_id: (row.budget_id as string) ?? null,
    type: row.type as TransactionType,
    amount: row.amount as number,
    description: (row.description as string) ?? null,
    notes: (row.notes as string) ?? null,
    transaction_date: row.transaction_date as string,
    transfer_to_account_id: (row.transfer_to_account_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as Transaction['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

function mapTransactionRow(row: Record<string, unknown>): TransactionRow {
  return {
    ...mapTransaction(row),
    category_name: (row.category_name as string) ?? null,
    category_icon: (row.category_icon as string) ?? null,
    category_color: (row.category_color as string) ?? null,
    account_name: (row.account_name as string) ?? null,
  };
}

function balanceDelta(type: TransactionType, amount: number): number {
  if (type === 'income') return amount;
  if (type === 'expense') return -amount;
  return 0;
}

const DETAIL_SELECT = `
  SELECT t.*,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    a.name as account_name
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN accounts a ON a.id = t.account_id
`;

export const transactionRepository = {
  async findAll(userId: string, limit = 50): Promise<TransactionRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `${DETAIL_SELECT}
       WHERE t.user_id = ? AND t.deleted_at IS NULL
       ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.map(mapTransactionRow);
  },

  async findExpenses(userId: string, limit = 400): Promise<TransactionRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `${DETAIL_SELECT}
       WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type = 'expense'
       ORDER BY t.transaction_date ASC, t.created_at ASC LIMIT ?`,
      [userId, limit]
    );
    return rows.map(mapTransactionRow);
  },

  async findByDateRange(userId: string, start: string, end: string): Promise<Transaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL
       AND transaction_date >= ? AND transaction_date <= ?
       ORDER BY transaction_date DESC`,
      [userId, start, end]
    );
    return rows.map(mapTransaction);
  },

  async create(
    userId: string,
    data: {
      account_id: string;
      category_id: string | null;
      budget_id?: string | null;
      type: TransactionType;
      amount: number;
      description?: string | null;
      notes?: string | null;
      transaction_date: string;
      transfer_to_account_id?: string | null;
    }
  ): Promise<Transaction> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    const budgetId = data.type === 'expense' ? (data.budget_id ?? null) : null;

    await db.runAsync(
      `INSERT INTO transactions (
        id, user_id, account_id, category_id, budget_id, type, amount, description, notes,
        transaction_date, transfer_to_account_id,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        data.account_id,
        data.category_id,
        budgetId,
        data.type,
        data.amount,
        data.description ?? null,
        data.notes ?? null,
        data.transaction_date,
        data.transfer_to_account_id ?? null,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );

    const transaction: Transaction = {
      id,
      user_id: userId,
      account_id: data.account_id,
      category_id: data.category_id,
      budget_id: budgetId,
      type: data.type,
      amount: data.amount,
      description: data.description ?? null,
      notes: data.notes ?? null,
      transaction_date: data.transaction_date,
      transfer_to_account_id: data.transfer_to_account_id ?? null,
      created_at: now,
      updated_at: now,
      ...sync,
    };

    await enqueueSync('transactions', id, 'CREATE', transaction as unknown as Record<string, unknown>);
    const delta = balanceDelta(data.type, data.amount);
    if (delta !== 0) {
      await accountRepository.adjustBalance(data.account_id, delta);
    }
    return transaction;
  },

  async findById(id: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return row ? mapTransaction(row) : null;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const existing = await this.findById(id);
    const now = nowIso();
    await db.runAsync(
      `UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1 WHERE id = ?`,
      [now, now, id]
    );
    await enqueueSync('transactions', id, 'DELETE', { id, deleted_at: now });
    if (existing) {
      const delta = balanceDelta(existing.type, existing.amount);
      if (delta !== 0) {
        await accountRepository.adjustBalance(existing.account_id, -delta);
      }
    }
  },

  async getIncomeExpenseBalance(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0) as total
       FROM transactions WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row?.total ?? 0;
  },

  async getMonthlyTotals(
    userId: string,
    monthStart: string,
    monthEnd: string
  ): Promise<{ income: number; expenses: number }> {
    const db = await getDatabase();
    const income = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL AND type = 'income'
       AND transaction_date >= ? AND transaction_date <= ?`,
      [userId, monthStart, monthEnd]
    );
    const expenses = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL AND type = 'expense'
       AND transaction_date >= ? AND transaction_date <= ?`,
      [userId, monthStart, monthEnd]
    );
    return { income: income?.total ?? 0, expenses: expenses?.total ?? 0 };
  },

  async getSpendingBreakdown(
    userId: string,
    monthStart: string,
    monthEnd: string
  ): Promise<SpendingSlice[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ name: string | null; color: string | null; total: number }>(
      `SELECT c.name as name, c.color as color, COALESCE(SUM(t.amount), 0) as total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type = 'expense'
         AND t.transaction_date >= ? AND t.transaction_date <= ?
       GROUP BY t.category_id
       ORDER BY total DESC`,
      [userId, monthStart, monthEnd]
    );
    const grand = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    if (grand <= 0) return [];
    return buildSpendingBreakdown(rows);
  },

  async getDailyTrend(userId: string, days = 14): Promise<DailyTrendPoint[]> {
    const db = await getDatabase();
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    const startIso = start.toISOString().slice(0, 10);
    const rows = await db.getAllAsync<{ transaction_date: string; type: string; amount: number }>(
      `SELECT transaction_date, type, amount FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL AND type IN ('income', 'expense')
       AND transaction_date >= ?`,
      [userId, startIso]
    );
    return buildDailyTrend(rows, days);
  },

  async countAll(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row?.total ?? 0;
  },
};
