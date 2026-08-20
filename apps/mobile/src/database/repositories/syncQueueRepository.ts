import type { SyncQueueItem, SyncQueueOperation } from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { newId } from '@/lib/ids';
import { useNetworkStore } from '@/stores/networkStore';

export async function countPendingSync(): Promise<number> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending' WHERE status = 'processing'`
  );
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed')`
  );
  return row?.count ?? 0;
}

export async function refreshPendingCount(): Promise<number> {
  const count = await countPendingSync();
  const store = useNetworkStore.getState();
  store.setPendingCount(count);
  if (!store.isConnected) {
    store.setSyncStatus('offline');
  } else if (count > 0 && store.syncStatus !== 'syncing') {
    store.setSyncStatus('pending');
  } else if (count === 0 && store.syncStatus !== 'syncing') {
    store.setSyncStatus('synced');
  }
  return count;
}

export async function enqueueSync(
  entityType: string,
  entityId: string,
  operation: SyncQueueOperation,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDatabase();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at, retry_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'pending')`,
    [newId(), entityType, entityId, operation, JSON.stringify(payload), now]
  );
  await refreshPendingCount();
}

export async function getPendingItems(limit = 100): Promise<SyncQueueItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

export async function markProcessing(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'processing', last_attempt_at = ? WHERE id = ?`,
    [nowIso(), id]
  );
}

export async function markCompleted(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE sync_queue SET status = 'completed', error_message = NULL WHERE id = ?`, [
    id,
  ]);
}

export async function markFailed(id: string, errorMessage: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = CASE WHEN retry_count + 1 >= 5 THEN 'failed' ELSE 'pending' END,
         retry_count = retry_count + 1,
         last_attempt_at = ?,
         error_message = ?
     WHERE id = ?`,
    [nowIso(), errorMessage.slice(0, 500), id]
  );
}
