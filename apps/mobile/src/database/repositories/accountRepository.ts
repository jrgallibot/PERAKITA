import { DEFAULT_ACCOUNTS, DEFAULT_CURRENCY, sortPaymentAccounts, type Account } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    type: row.type as Account['type'],
    initial_balance: row.initial_balance as number,
    current_balance: row.current_balance as number,
    currency: row.currency as string,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as Account['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

export const accountRepository = {
  async findAll(userId: string): Promise<Account[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM accounts WHERE user_id = ? AND deleted_at IS NULL ORDER BY name`,
      [userId]
    );
    return sortPaymentAccounts(rows.map(mapAccount));
  },

  async findById(id: string): Promise<Account | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return row ? mapAccount(row) : null;
  },

  async create(
    userId: string,
    data: Pick<Account, 'name' | 'type' | 'initial_balance' | 'currency'>
  ): Promise<Account> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');

    await db.runAsync(
      `INSERT INTO accounts (
        id, user_id, name, type, initial_balance, current_balance, currency, is_active,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        data.name,
        data.type,
        data.initial_balance,
        data.initial_balance,
        data.currency,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );

    const account: Account = {
      id,
      user_id: userId,
      name: data.name,
      type: data.type,
      initial_balance: data.initial_balance,
      current_balance: data.initial_balance,
      currency: data.currency,
      is_active: true,
      created_at: now,
      updated_at: now,
      ...sync,
    };

    await enqueueSync('accounts', id, 'CREATE', account as unknown as Record<string, unknown>);
    return account;
  },

  async adjustBalance(id: string, delta: number): Promise<void> {
    const db = await getDatabase();
    const now = nowIso();
    await db.runAsync(
      `UPDATE accounts
       SET current_balance = current_balance + ?,
           updated_at = ?,
           sync_status = 'updated',
           version = version + 1
       WHERE id = ? AND deleted_at IS NULL`,
      [delta, now, id]
    );
    const account = await accountRepository.findById(id);
    if (account) {
      await enqueueSync('accounts', id, 'UPDATE', account as unknown as Record<string, unknown>);
    }
  },

  async ensureDefaults(userId: string): Promise<Account[]> {
    const existing = await this.findAll(userId);
    const names = new Set(existing.map((account) => account.name.toLowerCase()));
    for (const preset of DEFAULT_ACCOUNTS) {
      if (names.has(preset.name.toLowerCase())) continue;
      try {
        await this.create(userId, {
          name: preset.name,
          type: preset.type,
          initial_balance: 0,
          currency: DEFAULT_CURRENCY,
        });
        names.add(preset.name.toLowerCase());
      } catch {
        // Keep going so Cash, GCash, Maya, and Bank can all appear.
      }
    }
    return this.findAll(userId);
  },

  async getTotalBalance(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(current_balance), 0) as total FROM accounts
       WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1`,
      [userId]
    );
    return row?.total ?? 0;
  },
};
