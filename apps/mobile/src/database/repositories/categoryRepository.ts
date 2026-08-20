import type { Category } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    type: row.type as Category['type'],
    icon: (row.icon as string) ?? null,
    color: (row.color as string) ?? null,
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as Category['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

export const categoryRepository = {
  async findAll(userId: string, type?: Category['type']): Promise<Category[]> {
    const db = await getDatabase();
    const query = type
      ? `SELECT * FROM categories WHERE user_id = ? AND type = ? AND deleted_at IS NULL ORDER BY name`
      : `SELECT * FROM categories WHERE user_id = ? AND deleted_at IS NULL ORDER BY type, name`;
    const params = type ? [userId, type] : [userId];
    const rows = await db.getAllAsync<Record<string, unknown>>(query, params);
    return rows.map(mapCategory);
  },

  async count(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row?.count ?? 0;
  },

  async create(
    userId: string,
    data: Pick<Category, 'name' | 'type' | 'icon' | 'color' | 'is_default'>
  ): Promise<Category> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');

    await db.runAsync(
      `INSERT INTO categories (
        id, user_id, name, type, icon, color, is_default, is_active,
        created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        data.name,
        data.type,
        data.icon,
        data.color,
        data.is_default ? 1 : 0,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );

    const category: Category = {
      id,
      user_id: userId,
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      is_default: data.is_default,
      is_active: true,
      created_at: now,
      updated_at: now,
      ...sync,
    };

    await enqueueSync('categories', id, 'CREATE', category as unknown as Record<string, unknown>);
    return category;
  },
};
