/** SQLite table column documentation — mirrors 001_initial.sql */

export const SQLITE_TABLES = [
  '_migrations',
  'profiles',
  'accounts',
  'categories',
  'transactions',
  'sync_queue',
  'app_settings',
] as const;
