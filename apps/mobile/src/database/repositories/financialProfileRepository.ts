import type { FinancialProfile, IncomeFrequency } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';

function mapRow(row: Record<string, unknown>): FinancialProfile {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    currency: row.currency as string,
    current_money: row.current_money as number,
    income_source: (row.income_source as string) ?? null,
    income_amount: row.income_amount as number,
    income_frequency: row.income_frequency as IncomeFrequency,
    next_payday: (row.next_payday as string) ?? null,
    onboarding_completed: Boolean(row.onboarding_completed),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as FinancialProfile['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

export const financialProfileRepository = {
  async findByUserId(userId: string): Promise<FinancialProfile | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM financial_profiles WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? mapRow(row) : null;
  },

  async upsert(
    userId: string,
    data: {
      currency?: string;
      current_money?: number;
      income_source?: string | null;
      income_amount?: number;
      income_frequency?: IncomeFrequency;
      next_payday?: string | null;
      onboarding_completed?: boolean;
    }
  ): Promise<FinancialProfile> {
    const db = await getDatabase();
    const existing = await this.findByUserId(userId);
    const now = nowIso();

    if (existing) {
      const profile: FinancialProfile = {
        ...existing,
        currency: data.currency ?? existing.currency,
        current_money: data.current_money ?? existing.current_money,
        income_source: data.income_source !== undefined ? data.income_source : existing.income_source,
        income_amount: data.income_amount ?? existing.income_amount,
        income_frequency: data.income_frequency ?? existing.income_frequency,
        next_payday: data.next_payday !== undefined ? data.next_payday : existing.next_payday,
        onboarding_completed: data.onboarding_completed ?? existing.onboarding_completed,
        updated_at: now,
        sync_status: 'updated',
        version: existing.version + 1,
      };
      await db.runAsync(
        `UPDATE financial_profiles SET currency = ?, current_money = ?, income_source = ?,
         income_amount = ?, income_frequency = ?, next_payday = ?, onboarding_completed = ?,
         updated_at = ?, sync_status = 'updated', version = version + 1 WHERE id = ?`,
        [
          profile.currency,
          profile.current_money,
          profile.income_source,
          profile.income_amount,
          profile.income_frequency,
          profile.next_payday,
          profile.onboarding_completed ? 1 : 0,
          now,
          existing.id,
        ]
      );
      await enqueueSync('financial_profiles', existing.id, 'UPDATE', profile as unknown as Record<string, unknown>);
      return profile;
    }

    const id = newId();
    const sync = createSyncFields('pending');
    const profile: FinancialProfile = {
      id,
      user_id: userId,
      currency: data.currency ?? 'PHP',
      current_money: data.current_money ?? 0,
      income_source: data.income_source ?? null,
      income_amount: data.income_amount ?? 0,
      income_frequency: data.income_frequency ?? 'monthly',
      next_payday: data.next_payday ?? null,
      onboarding_completed: data.onboarding_completed ?? false,
      created_at: now,
      updated_at: now,
      ...sync,
    };
    await db.runAsync(
      `INSERT INTO financial_profiles (
        id, user_id, currency, current_money, income_source, income_amount, income_frequency,
        next_payday, onboarding_completed, created_at, updated_at, deleted_at,
        sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        profile.currency,
        profile.current_money,
        profile.income_source,
        profile.income_amount,
        profile.income_frequency,
        profile.next_payday,
        profile.onboarding_completed ? 1 : 0,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );
    await enqueueSync('financial_profiles', id, 'CREATE', profile as unknown as Record<string, unknown>);
    return profile;
  },
};
