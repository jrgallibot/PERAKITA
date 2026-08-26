import type { EmergencyFundTarget } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';

function mapRow(row: Record<string, unknown>): EmergencyFundTarget {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    target_amount: row.target_amount as number,
    current_amount: row.current_amount as number,
    recommended_target: (row.recommended_target as number) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as EmergencyFundTarget['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

export const emergencyFundRepository = {
  async findByUserId(userId: string): Promise<EmergencyFundTarget | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM emergency_fund_targets WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? mapRow(row) : null;
  },

  async upsert(
    userId: string,
    data: { target_amount?: number; current_amount?: number; recommended_target?: number | null }
  ): Promise<EmergencyFundTarget> {
    const db = await getDatabase();
    const existing = await this.findByUserId(userId);
    const now = nowIso();

    if (existing) {
      const fund: EmergencyFundTarget = {
        ...existing,
        target_amount: data.target_amount ?? existing.target_amount,
        current_amount: data.current_amount ?? existing.current_amount,
        recommended_target:
          data.recommended_target !== undefined ? data.recommended_target : existing.recommended_target,
        updated_at: now,
        sync_status: 'updated',
        version: existing.version + 1,
      };
      await db.runAsync(
        `UPDATE emergency_fund_targets SET target_amount = ?, current_amount = ?, recommended_target = ?,
         updated_at = ?, sync_status = 'updated', version = version + 1 WHERE id = ?`,
        [fund.target_amount, fund.current_amount, fund.recommended_target, now, existing.id]
      );
      await enqueueSync('emergency_fund_targets', existing.id, 'UPDATE', fund as unknown as Record<string, unknown>);
      return fund;
    }

    const id = newId();
    const sync = createSyncFields('pending');
    const fund: EmergencyFundTarget = {
      id,
      user_id: userId,
      target_amount: data.target_amount ?? 0,
      current_amount: data.current_amount ?? 0,
      recommended_target: data.recommended_target ?? null,
      created_at: now,
      updated_at: now,
      ...sync,
    };
    await db.runAsync(
      `INSERT INTO emergency_fund_targets (
        id, user_id, target_amount, current_amount, recommended_target,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        fund.target_amount,
        fund.current_amount,
        fund.recommended_target,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );
    await enqueueSync('emergency_fund_targets', id, 'CREATE', fund as unknown as Record<string, unknown>);
    return fund;
  },
};
