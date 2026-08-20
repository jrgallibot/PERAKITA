import { getDatabase, nowIso } from '@/database/database';
import { enqueueSync } from '@/database/repositories/syncQueueRepository';
import { supabase } from '@/lib/supabase';
import { useNetworkStore } from '@/stores/networkStore';

async function enqueueDeletes(
  entityType: string,
  ids: string[],
  now: string
): Promise<void> {
  for (const id of ids) {
    await enqueueSync(entityType, id, 'DELETE', { id, deleted_at: now });
  }
}

async function listActiveIds(table: string, userId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM ${table} WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  return rows.map((row) => row.id);
}

async function softDeleteTable(table: string, userId: string, now: string): Promise<string[]> {
  const ids = await listActiveIds(table, userId);
  if (ids.length === 0) return ids;
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${table}
     SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1
     WHERE user_id = ? AND deleted_at IS NULL`,
    [now, now, userId]
  );
  return ids;
}

async function resetAccountBalances(userId: string, now: string): Promise<void> {
  const db = await getDatabase();
  const accounts = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM accounts WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  await db.runAsync(
    `UPDATE accounts
     SET current_balance = 0,
         initial_balance = 0,
         updated_at = ?,
         sync_status = 'updated',
         version = version + 1
     WHERE user_id = ? AND deleted_at IS NULL`,
    [now, userId]
  );
  for (const account of accounts) {
    await enqueueSync('accounts', account.id, 'UPDATE', {
      id: account.id,
      current_balance: 0,
      initial_balance: 0,
      updated_at: now,
    });
  }
}

async function resetCloudAccountBalances(userId: string, now: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({
      current_balance: 0,
      initial_balance: 0,
      updated_at: now,
      sync_status: 'updated',
    })
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (error) throw error;
}

async function clearCloudBalance(userId: string, now: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('user_id', userId)
    .in('type', ['income', 'expense'])
    .is('deleted_at', null);
  if (error) throw error;
  await resetCloudAccountBalances(userId, now);
}

async function clearCloudFinanceData(userId: string, now: string): Promise<void> {
  const tables = [
    'transactions',
    'loan_payments',
    'loans',
    'budget_categories',
    'budgets',
  ] as const;

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (error) throw error;
  }
  await resetCloudAccountBalances(userId, now);
}

/** Soft-delete income & expense rows and zero payment-mode balances. */
export async function resetCurrentBalance(userId: string): Promise<void> {
  const db = await getDatabase();
  const now = nowIso();
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND type IN ('income', 'expense')`,
    [userId]
  );
  await db.runAsync(
    `UPDATE transactions
     SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1
     WHERE user_id = ? AND deleted_at IS NULL AND type IN ('income', 'expense')`,
    [now, now, userId]
  );
  await enqueueDeletes(
    'transactions',
    rows.map((row) => row.id),
    now
  );
  await resetAccountBalances(userId, now);

  if (useNetworkStore.getState().isConnected) {
    try {
      await clearCloudBalance(userId, now);
    } catch {
      // Local wipe still applies; pending sync queue will retry cloud.
    }
  }
}

/** Soft-delete loans, budgets, all transactions, and related rows; zero balances. */
export async function clearAllFinanceData(userId: string): Promise<void> {
  const now = nowIso();
  const transactionIds = await softDeleteTable('transactions', userId, now);
  const paymentIds = await softDeleteTable('loan_payments', userId, now);
  const loanIds = await softDeleteTable('loans', userId, now);
  const budgetCategoryIds = await softDeleteTable('budget_categories', userId, now);
  const budgetIds = await softDeleteTable('budgets', userId, now);

  await enqueueDeletes('transactions', transactionIds, now);
  await enqueueDeletes('loan_payments', paymentIds, now);
  await enqueueDeletes('loans', loanIds, now);
  await enqueueDeletes('budget_categories', budgetCategoryIds, now);
  await enqueueDeletes('budgets', budgetIds, now);
  await resetAccountBalances(userId, now);

  if (useNetworkStore.getState().isConnected) {
    try {
      await clearCloudFinanceData(userId, now);
    } catch {
      // Local wipe still applies; pending sync queue will retry cloud.
    }
  }
}
