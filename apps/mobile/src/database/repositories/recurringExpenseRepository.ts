import type { RecurringExpense, RecurringFrequency } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';

function mapRow(row: Record<string, unknown>): RecurringExpense {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    amount: row.amount as number,
    category_id: (row.category_id as string) ?? null,
    frequency: row.frequency as RecurringFrequency,
    custom_interval_days: (row.custom_interval_days as number) ?? null,
    next_due_date: row.next_due_date as string,
    payment_method: (row.payment_method as string) ?? null,
    notes: (row.notes as string) ?? null,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as RecurringExpense['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

export const recurringExpenseRepository = {
  async findAll(userId: string): Promise<RecurringExpense[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM recurring_expenses WHERE user_id = ? AND deleted_at IS NULL ORDER BY next_due_date ASC`,
      [userId]
    );
    return rows.map(mapRow);
  },

  async getUpcoming(userId: string, withinDays = 30): Promise<RecurringExpense[]> {
    const db = await getDatabase();
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + withinDays);
    const endIso = end.toISOString().slice(0, 10);
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM recurring_expenses
       WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1
         AND next_due_date >= ? AND next_due_date <= ?
       ORDER BY next_due_date ASC`,
      [userId, today, endIso]
    );
    return rows.map(mapRow);
  },

  async getUpcomingTotal(userId: string, withinDays = 30): Promise<number> {
    const items = await this.getUpcoming(userId, withinDays);
    return items.reduce((sum, item) => sum + item.amount, 0);
  },

  async create(
    userId: string,
    data: {
      name: string;
      amount: number;
      category_id?: string | null;
      frequency: RecurringFrequency;
      custom_interval_days?: number | null;
      next_due_date: string;
      payment_method?: string | null;
      notes?: string | null;
    }
  ): Promise<RecurringExpense> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    const item: RecurringExpense = {
      id,
      user_id: userId,
      name: data.name,
      amount: data.amount,
      category_id: data.category_id ?? null,
      frequency: data.frequency,
      custom_interval_days: data.custom_interval_days ?? null,
      next_due_date: data.next_due_date,
      payment_method: data.payment_method ?? null,
      notes: data.notes ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
      ...sync,
    };
    await db.runAsync(
      `INSERT INTO recurring_expenses (
        id, user_id, name, amount, category_id, frequency, custom_interval_days,
        next_due_date, payment_method, notes, is_active,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        item.name,
        item.amount,
        item.category_id,
        item.frequency,
        item.custom_interval_days,
        item.next_due_date,
        item.payment_method,
        item.notes,
        1,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );
    await enqueueSync('recurring_expenses', id, 'CREATE', item as unknown as Record<string, unknown>);
    return item;
  },

  async softDelete(userId: string, id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowIso();
    await db.runAsync(
      `UPDATE recurring_expenses SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1
       WHERE id = ? AND user_id = ?`,
      [now, now, id, userId]
    );
    await enqueueSync('recurring_expenses', id, 'DELETE', { id, deleted_at: now });
  },
};
