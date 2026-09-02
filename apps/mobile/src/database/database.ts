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
  {
    name: '005_transaction_budget_id',
    sql: `ALTER TABLE transactions ADD COLUMN budget_id TEXT;`,
  },
  {
    name: '006_local_credentials',
    sql: `
CREATE TABLE IF NOT EXISTS local_credentials (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  supabase_user_id TEXT,
  auth_sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_credentials_email ON local_credentials(email);
CREATE INDEX IF NOT EXISTS idx_local_credentials_sync ON local_credentials(auth_sync_status);
`,
  },
  {
    name: '007_peso_module',
    sql: `
ALTER TABLE transactions ADD COLUMN payment_method TEXT;

CREATE TABLE IF NOT EXISTS financial_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'PHP',
  current_money REAL NOT NULL DEFAULT 0,
  income_source TEXT,
  income_amount REAL NOT NULL DEFAULT 0,
  income_frequency TEXT NOT NULL DEFAULT 'monthly',
  next_payday TEXT,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user ON financial_profiles(user_id);

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  custom_interval_days INTEGER,
  next_due_date TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_due ON recurring_expenses(user_id, next_due_date);

CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);

CREATE TABLE IF NOT EXISTS savings_contributions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  amount REAL NOT NULL,
  contribution_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON savings_contributions(goal_id);

CREATE TABLE IF NOT EXISTS emergency_fund_targets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  target_amount REAL NOT NULL DEFAULT 0,
  current_amount REAL NOT NULL DEFAULT 0,
  recommended_target REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
`,
  },
  {
    name: '008_notification_prefs',
    sql: `
ALTER TABLE profiles ADD COLUMN notify_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN notify_bills INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN notify_loans INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN notify_budget INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN notify_safe_to_spend INTEGER NOT NULL DEFAULT 1;
`,
  },
  {
    name: '009_savings_goals_extended',
    sql: `
ALTER TABLE savings_goals ADD COLUMN category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE savings_goals ADD COLUMN icon TEXT NOT NULL DEFAULT 'flag-outline';
ALTER TABLE savings_goals ADD COLUMN description TEXT;
ALTER TABLE savings_goals ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE savings_contributions ADD COLUMN source TEXT;

CREATE TABLE IF NOT EXISTS goal_milestones (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  percentage INTEGER NOT NULL,
  reached_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TEXT,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(goal_id, percentage)
);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);

ALTER TABLE profiles ADD COLUMN notify_goals INTEGER NOT NULL DEFAULT 1;
`,
  },
  {
    name: '010_linked_accounts',
    sql: `
ALTER TABLE accounts ADD COLUMN provider TEXT;
ALTER TABLE accounts ADD COLUMN masked_identifier TEXT;
ALTER TABLE accounts ADD COLUMN is_linked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN linked_at TEXT;
ALTER TABLE accounts ADD COLUMN last_balance_sync_at TEXT;

UPDATE accounts SET provider = 'cash' WHERE lower(name) = 'cash' AND provider IS NULL;
UPDATE accounts SET provider = 'gcash' WHERE lower(name) = 'gcash' AND provider IS NULL;
UPDATE accounts SET provider = 'maya' WHERE lower(name) = 'maya' AND provider IS NULL;
UPDATE accounts SET provider = 'bank' WHERE lower(name) = 'bank' AND provider IS NULL;
UPDATE accounts SET provider = 'other' WHERE provider IS NULL;
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
