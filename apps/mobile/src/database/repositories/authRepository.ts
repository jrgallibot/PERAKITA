import { getDatabase, nowIso } from '../database';
import { newId } from './baseRepository';

export type LocalCredential = {
  id: string;
  user_id: string;
  email: string;
  password_salt: string;
  password_hash: string;
  display_name: string | null;
  supabase_user_id: string | null;
  auth_sync_status: 'pending' | 'synced' | 'failed';
  created_at: string;
  updated_at: string;
};

function mapRow(row: Record<string, unknown>): LocalCredential {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    email: row.email as string,
    password_salt: row.password_salt as string,
    password_hash: row.password_hash as string,
    display_name: (row.display_name as string) ?? null,
    supabase_user_id: (row.supabase_user_id as string) ?? null,
    auth_sync_status: row.auth_sync_status as LocalCredential['auth_sync_status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export const authRepository = {
  async findByEmail(email: string): Promise<LocalCredential | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM local_credentials WHERE lower(email) = lower(?) LIMIT 1`,
      [email.trim()]
    );
    return row ? mapRow(row) : null;
  },

  async findByUserId(userId: string): Promise<LocalCredential | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM local_credentials WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return row ? mapRow(row) : null;
  },

  async findPendingSync(): Promise<LocalCredential[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM local_credentials WHERE auth_sync_status = 'pending' ORDER BY created_at ASC`
    );
    return rows.map(mapRow);
  },

  async create(input: {
    userId: string;
    email: string;
    passwordSalt: string;
    passwordHash: string;
    displayName?: string | null;
    supabaseUserId?: string | null;
    authSyncStatus?: LocalCredential['auth_sync_status'];
  }): Promise<LocalCredential> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const status = input.authSyncStatus ?? 'pending';
    await db.runAsync(
      `INSERT INTO local_credentials (
        id, user_id, email, password_salt, password_hash, display_name,
        supabase_user_id, auth_sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId,
        input.email.trim().toLowerCase(),
        input.passwordSalt,
        input.passwordHash,
        input.displayName ?? null,
        input.supabaseUserId ?? null,
        status,
        now,
        now,
      ]
    );
    return {
      id,
      user_id: input.userId,
      email: input.email.trim().toLowerCase(),
      password_salt: input.passwordSalt,
      password_hash: input.passwordHash,
      display_name: input.displayName ?? null,
      supabase_user_id: input.supabaseUserId ?? null,
      auth_sync_status: status,
      created_at: now,
      updated_at: now,
    };
  },

  async upsertCachedLogin(input: {
    userId: string;
    email: string;
    passwordSalt: string;
    passwordHash: string;
    displayName?: string | null;
    supabaseUserId: string;
  }): Promise<void> {
    const existing = await this.findByEmail(input.email);
    const now = nowIso();
    const db = await getDatabase();
    if (existing) {
      await db.runAsync(
        `UPDATE local_credentials SET
          user_id = ?, password_salt = ?, password_hash = ?, display_name = ?,
          supabase_user_id = ?, auth_sync_status = 'synced', updated_at = ?
         WHERE id = ?`,
        [
          input.userId,
          input.passwordSalt,
          input.passwordHash,
          input.displayName ?? existing.display_name,
          input.supabaseUserId,
          now,
          existing.id,
        ]
      );
      return;
    }
    await this.create({
      userId: input.userId,
      email: input.email,
      passwordSalt: input.passwordSalt,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      supabaseUserId: input.supabaseUserId,
      authSyncStatus: 'synced',
    });
  },

  async markSynced(userId: string, supabaseUserId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE local_credentials SET
        supabase_user_id = ?, auth_sync_status = 'synced', updated_at = ?
       WHERE user_id = ?`,
      [supabaseUserId, nowIso(), userId]
    );
  },

  async markFailed(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE local_credentials SET auth_sync_status = 'failed', updated_at = ? WHERE user_id = ?`,
      [nowIso(), userId]
    );
  },

  async remapUserId(oldUserId: string, newUserId: string): Promise<void> {
    if (oldUserId === newUserId) return;
    const db = await getDatabase();
    const tables = [
      'profiles',
      'accounts',
      'categories',
      'transactions',
      'loans',
      'loan_payments',
      'budgets',
      'budget_categories',
      'app_settings',
      'local_credentials',
    ] as const;

    await db.execAsync('BEGIN');
    try {
      for (const table of tables) {
        await db.runAsync(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`, [
          newUserId,
          oldUserId,
        ]);
      }

      const queue = await db.getAllAsync<{ id: string; payload: string }>(
        `SELECT id, payload FROM sync_queue`
      );
      for (const item of queue) {
        try {
          const parsed = JSON.parse(item.payload) as Record<string, unknown>;
          if (parsed.user_id === oldUserId) {
            parsed.user_id = newUserId;
            await db.runAsync(`UPDATE sync_queue SET payload = ? WHERE id = ?`, [
              JSON.stringify(parsed),
              item.id,
            ]);
          }
        } catch {
          // leave payload unchanged if not JSON
        }
      }

      for (const table of [
        'accounts',
        'categories',
        'transactions',
        'loans',
        'loan_payments',
        'budgets',
        'budget_categories',
      ] as const) {
        await db.runAsync(
          `UPDATE ${table} SET sync_status = 'pending', updated_at = ? WHERE user_id = ?`,
          [nowIso(), newUserId]
        );
      }

      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  },
};
