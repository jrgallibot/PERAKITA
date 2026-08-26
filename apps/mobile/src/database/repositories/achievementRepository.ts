import type { Achievement, AchievementCode, UserAchievement } from '@perakita/shared';
import { DEFAULT_ACHIEVEMENTS } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';

function mapAchievement(row: Record<string, unknown>): Achievement {
  return {
    id: row.id as string,
    code: row.code as AchievementCode,
    title: row.title as string,
    description: row.description as string,
    icon: row.icon as string,
  };
}

function mapUserAchievement(row: Record<string, unknown>): UserAchievement {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    achievement_id: row.achievement_id as string,
    unlocked_at: row.unlocked_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as UserAchievement['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

export const achievementRepository = {
  async seedDefaults(): Promise<void> {
    const db = await getDatabase();
    for (const item of DEFAULT_ACHIEVEMENTS) {
      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM achievements WHERE code = ?`,
        [item.code]
      );
      if (existing) continue;
      await db.runAsync(
        `INSERT INTO achievements (id, code, title, description, icon) VALUES (?, ?, ?, ?, ?)`,
        [newId(), item.code, item.title, item.description, item.icon]
      );
    }
  },

  async findByCode(code: AchievementCode): Promise<Achievement | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM achievements WHERE code = ?`,
      [code]
    );
    return row ? mapAchievement(row) : null;
  },

  async findUserAchievements(userId: string): Promise<Array<UserAchievement & { title: string; icon: string }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT ua.*, a.title, a.icon FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = ? AND ua.deleted_at IS NULL
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );
    return rows.map((row) => ({
      ...mapUserAchievement(row),
      title: row.title as string,
      icon: row.icon as string,
    }));
  },

  async unlock(userId: string, code: AchievementCode): Promise<UserAchievement | null> {
    await this.seedDefaults();
    const achievement = await this.findByCode(code);
    if (!achievement) return null;

    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ? AND deleted_at IS NULL`,
      [userId, achievement.id]
    );
    if (existing) return null;

    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    const unlocked: UserAchievement = {
      id,
      user_id: userId,
      achievement_id: achievement.id,
      unlocked_at: now,
      created_at: now,
      updated_at: now,
      ...sync,
    };

    await db.runAsync(
      `INSERT INTO user_achievements (
        id, user_id, achievement_id, unlocked_at,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        achievement.id,
        now,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );
    await enqueueSync('user_achievements', id, 'CREATE', unlocked as unknown as Record<string, unknown>);
    return unlocked;
  },
};
