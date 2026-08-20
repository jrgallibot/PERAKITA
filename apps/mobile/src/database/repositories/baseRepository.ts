import type { SyncStatus } from '@perakita/shared';

export { newId } from '@/lib/ids';

export interface SyncFields {
  sync_status: SyncStatus;
  last_synced_at: string | null;
  device_id: string | null;
  version: number;
  deleted_at: string | null;
}

export function createSyncFields(status: SyncStatus = 'pending'): SyncFields {
  return {
    sync_status: status,
    last_synced_at: null,
    device_id: null,
    version: 1,
    deleted_at: null,
  };
}

export { enqueueSync } from './syncQueueRepository';
