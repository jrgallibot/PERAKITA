import { getDatabase, nowIso } from '@/database/database';
import {
  getPendingItems,
  markCompleted,
  markFailed,
  markProcessing,
  refreshPendingCount,
} from '@/database/repositories/syncQueueRepository';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useNetworkStore } from '@/stores/networkStore';
import { fetchProfileFromCloud } from '@/services/settingsService';
import { getWebAppUrl } from '@/lib/webApp';

export const SYNC_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'loans',
  'loan_payments',
  'budgets',
  'budget_categories',
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

const TABLE_PRIORITY: Record<string, number> = {
  accounts: 0,
  categories: 1,
  transactions: 2,
  loans: 3,
  budgets: 4,
  loan_payments: 5,
  budget_categories: 6,
};

const BOOL_FIELDS: Record<SyncTable, string[]> = {
  accounts: ['is_active'],
  categories: ['is_default', 'is_active'],
  transactions: [],
  loans: [],
  loan_payments: [],
  budgets: [],
  budget_categories: [],
};

const NUMBER_FIELDS = [
  'amount',
  'initial_balance',
  'current_balance',
  'version',
  'principal_amount',
  'interest_rate',
  'total_amount',
  'amount_paid',
  'remaining_amount',
  'limit_amount',
];

const TABLE_COLUMNS: Record<SyncTable, string[]> = {
  accounts: [
    'id',
    'user_id',
    'name',
    'type',
    'initial_balance',
    'current_balance',
    'currency',
    'is_active',
    'created_at',
    'updated_at',
    'deleted_at',
    'sync_status',
    'last_synced_at',
    'device_id',
    'version',
  ],
  categories: [
    'id',
    'user_id',
    'name',
    'type',
    'icon',
    'color',
    'is_default',
    'is_active',
    'created_at',
    'updated_at',
    'deleted_at',
    'sync_status',
    'last_synced_at',
    'device_id',
    'version',
  ],
  transactions: [
    'id',
    'user_id',
    'account_id',
    'category_id',
    'type',
    'amount',
    'description',
    'notes',
    'transaction_date',
    'transfer_to_account_id',
    'created_at',
    'updated_at',
    'deleted_at',
    'sync_status',
    'last_synced_at',
    'device_id',
    'version',
  ],
  loans: [
    'id',
    'user_id',
    'person_name',
    'person_contact',
    'loan_type',
    'principal_amount',
    'interest_rate',
    'total_amount',
    'amount_paid',
    'remaining_amount',
    'start_date',
    'due_date',
    'payment_frequency',
    'status',
    'notes',
    'created_at',
    'updated_at',
    'deleted_at',
    'sync_status',
    'version',
  ],
  loan_payments: [
    'id',
    'user_id',
    'loan_id',
    'amount',
    'payment_date',
    'payment_method',
    'notes',
    'created_at',
    'updated_at',
    'deleted_at',
    'sync_status',
    'version',
  ],
  budgets: [
    'id',
    'user_id',
    'name',
    'period_start',
    'period_end',
    'total_amount',
    'created_at',
    'updated_at',
    'deleted_at',
    'sync_status',
    'version',
  ],
  budget_categories: [
    'id',
    'user_id',
    'budget_id',
    'category_id',
    'limit_amount',
    'created_at',
    'updated_at',
    'deleted_at',
    'sync_status',
    'version',
  ],
};

let syncInFlight: Promise<void> | null = null;

function isSyncTable(value: string): value is SyncTable {
  return (SYNC_TABLES as readonly string[]).includes(value);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sqliteBool(value: unknown): number {
  return value === true || value === 1 || value === '1' ? 1 : 0;
}

function pickColumns(table: SyncTable, row: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set(TABLE_COLUMNS[table]);
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (allowed.has(key)) next[key] = row[key];
  }
  return next;
}

function toCloudRow(table: SyncTable, payload: Record<string, unknown>): Record<string, unknown> {
  const row = pickColumns(table, payload);
  for (const field of BOOL_FIELDS[table]) {
    if (field in row) row[field] = Boolean(row[field]);
  }
  for (const field of NUMBER_FIELDS) {
    if (field in row) row[field] = toNumber(row[field]);
  }
  row.sync_status = 'synced';
  if (TABLE_COLUMNS[table].includes('last_synced_at')) {
    row.last_synced_at = nowIso();
  }
  return row;
}

async function markLocalSynced(table: SyncTable, id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${table} SET sync_status = 'synced', last_synced_at = ? WHERE id = ?`,
    [nowIso(), id]
  );
}

async function pushQueue(): Promise<void> {
  const items = await getPendingItems();
  items.sort((a, b) => {
    const pa = TABLE_PRIORITY[a.entity_type] ?? 9;
    const pb = TABLE_PRIORITY[b.entity_type] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.created_at.localeCompare(b.created_at);
  });

  for (const item of items) {
    if (!isSyncTable(item.entity_type)) {
      await markCompleted(item.id);
      continue;
    }

    await markProcessing(item.id);
    try {
      const payload = JSON.parse(item.payload) as Record<string, unknown>;

      if (item.operation === 'DELETE') {
        const deletedAt = (payload.deleted_at as string) ?? nowIso();
        const { error } = await supabase
          .from(item.entity_type)
          .update({
            deleted_at: deletedAt,
            sync_status: 'deleted',
            updated_at: nowIso(),
          })
          .eq('id', item.entity_id);

        if (error) throw error;
      } else {
        const row = toCloudRow(item.entity_type, payload);
        const { error } = await supabase.from(item.entity_type).upsert(row, { onConflict: 'id' });
        if (error) throw error;
      }

      await markLocalSynced(item.entity_type, item.entity_id);
      await markCompleted(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      await markFailed(item.id, message);
    }
  }
}

async function upsertLocalFromRemote(table: SyncTable, remote: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const id = String(remote.id);
  const local = await db.getFirstAsync<{ sync_status: string; version: number; updated_at: string }>(
    `SELECT sync_status, version, updated_at FROM ${table} WHERE id = ?`,
    [id]
  );

  if (local && (local.sync_status === 'pending' || local.sync_status === 'updated')) {
    return;
  }

  if (
    local &&
    toNumber(remote.version) <= local.version &&
    String(remote.updated_at ?? '') <= local.updated_at
  ) {
    return;
  }

  const columns = TABLE_COLUMNS[table];
  const values = columns.map((column) => {
    if (BOOL_FIELDS[table].includes(column)) return sqliteBool(remote[column]);
    if (column === 'sync_status') return 'synced';
    if (column === 'last_synced_at') return nowIso();
    if (NUMBER_FIELDS.includes(column)) {
      return toNumber(remote[column]);
    }
    return (remote[column] as string | number | null) ?? null;
  });

  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');

  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    values
  );
}

async function pullRemote(userId: string): Promise<void> {
  for (const table of SYNC_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    if (error) throw error;
    for (const row of data ?? []) {
      await upsertLocalFromRemote(table, row as Record<string, unknown>);
    }
  }
}

export async function syncNow(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (!useNetworkStore.getState().isConnected) {
    useNetworkStore.getState().setSyncStatus('offline');
    return;
  }
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    useNetworkStore.getState().setSyncStatus('syncing');
    try {
      await getDatabase();
      await pushQueue();
      await pullRemote(userId);
      // Profile lives outside the queue tables but must match the web dashboard.
      try {
        await fetchProfileFromCloud(userId);
      } catch {
        // Keep finance sync successful even if profile pull fails.
      }
      await refreshPendingCount();
      if (useNetworkStore.getState().pendingCount === 0) {
        useNetworkStore.getState().setSyncStatus('synced');
      }
    } catch {
      useNetworkStore.getState().setSyncStatus('pending');
      await refreshPendingCount();
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** Human-readable target for Settings UI (same cloud backend as the Vercel web app). */
export function getSyncDestinationLabel(): string {
  return getWebAppUrl().replace(/^https?:\/\//, '');
}
