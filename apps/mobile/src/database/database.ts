import * as SQLite from 'expo-sqlite';

const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  default_currency TEXT NOT NULL DEFAULT 'PHP',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  initial_balance REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PHP',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_sync ON accounts(user_id, sync_status);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(user_id, type);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category_id TEXT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  notes TEXT,
  transaction_date TEXT NOT NULL,
  transfer_to_account_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(user_id, sync_status);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  theme_mode TEXT NOT NULL DEFAULT 'system',
  default_currency TEXT NOT NULL DEFAULT 'PHP',
  device_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const MIGRATIONS: { name: string; sql: string }[] = [
  { name: '001_initial', sql: MIGRATION_001 },
  {
    name: '002_loans_budgets',
    sql: `
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  person_contact TEXT,
  loan_type TEXT NOT NULL,
  principal_amount REAL NOT NULL,
  interest_rate REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  amount_paid REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL,
  start_date TEXT,
  due_date TEXT,
  payment_frequency TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

CREATE TABLE IF NOT EXISTS loan_payments (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  loan_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budget_categories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  budget_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  limit_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
`,
  },
  {
    name: '003_loan_payment_method',
    sql: `ALTER TABLE loan_payments ADD COLUMN payment_method TEXT;`,
  },
  {
    name: '004_profile_fields',
    sql: `
ALTER TABLE profiles ADD COLUMN contact TEXT;
ALTER TABLE profiles ADD COLUMN address TEXT;
ALTER TABLE profiles ADD COLUMN birthday TEXT;
ALTER TABLE profiles ADD COLUMN sex TEXT;
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
`,
  },
];

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigration(db: SQLite.SQLiteDatabase, sql: string): Promise<void> {
  for (const statement of splitSqlStatements(sql)) {
    await db.execAsync(`${statement};`);
  }
}

let dbReady: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('PeraKita.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  for (const migration of MIGRATIONS) {
    const row = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM _migrations WHERE name = ?',
      [migration.name]
    );
    if (!row) {
      await runMigration(db, migration.sql);
      await db.runAsync('INSERT INTO _migrations (name) VALUES (?)', [migration.name]);
    }
  }

  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbReady) {
    dbReady = openAndMigrate().catch((error) => {
      dbReady = null;
      throw error;
    });
  }
  return dbReady;
}

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}

export function nowIso(): string {
  return new Date().toISOString();
}
