export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'loan_received'
  | 'loan_given'
  | 'loan_payment'
  | 'debt_payment'
  | 'adjustment';

export type SyncStatus = 'pending' | 'synced' | 'updated' | 'deleted' | 'conflict';

export type CategoryType = 'expense' | 'income';

export type AccountType =
  | 'cash'
  | 'ewallet'
  | 'bank'
  | 'savings'
  | 'emergency'
  | 'other';

export type LoanType = 'debt' | 'receivable';

export type LoanStatus = 'active' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export type SyncQueueOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export type SyncQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncMetadata {
  sync_status: SyncStatus;
  last_synced_at: string | null;
  device_id: string | null;
  version: number;
  deleted_at: string | null;
}

export type Sex = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  contact: string | null;
  address: string | null;
  birthday: string | null;
  sex: Sex | null;
  avatar_url: string | null;
  default_currency: string;
  report_email_enabled: boolean;
  report_email_period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  report_email_last_sent_at: string | null;
  notify_enabled: boolean;
  notify_bills: boolean;
  notify_loans: boolean;
  notify_budget: boolean;
  notify_safe_to_spend: boolean;
  notify_goals: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account extends SyncMetadata {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category extends SyncMetadata {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction extends SyncMetadata {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  /** When set, expense counts toward this budget only. Null = transaction log only. */
  budget_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  notes: string | null;
  transaction_date: string;
  transfer_to_account_id: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncQueueOperation;
  payload: string;
  created_at: string;
  retry_count: number;
  last_attempt_at: string | null;
  status: SyncQueueStatus;
  error_message: string | null;
}

export interface AppSettings {
  id: string;
  user_id: string;
  theme_mode: 'system' | 'light' | 'dark';
  default_currency: string;
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loan extends SyncMetadata {
  id: string;
  user_id: string;
  person_name: string;
  person_contact: string | null;
  loan_type: LoanType;
  principal_amount: number;
  interest_rate: number;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  start_date: string | null;
  due_date: string | null;
  payment_frequency: string | null;
  status: LoanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment extends SyncMetadata {
  id: string;
  user_id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget extends SyncMetadata {
  id: string;
  user_id: string;
  name: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory extends SyncMetadata {
  id: string;
  user_id: string;
  budget_id: string;
  category_id: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'restaurant', color: '#EF4444' },
  { name: 'Transportation', icon: 'car', color: '#3B82F6' },
  { name: 'Gas/Fuel', icon: 'flame', color: '#F97316' },
  { name: 'Bills', icon: 'receipt', color: '#8B5CF6' },
  { name: 'Electricity', icon: 'flash', color: '#EAB308' },
  { name: 'Water', icon: 'water', color: '#06B6D4' },
  { name: 'Internet', icon: 'wifi', color: '#6366F1' },
  { name: 'Rent', icon: 'home', color: '#64748B' },
  { name: 'Shopping', icon: 'cart', color: '#EC4899' },
  { name: 'Healthcare', icon: 'medkit', color: '#10B981' },
  { name: 'Education', icon: 'school', color: '#0EA5E9' },
  { name: 'Entertainment', icon: 'game-controller', color: '#A855F7' },
  { name: 'Travel', icon: 'airplane', color: '#14B8A6' },
  { name: 'Personal Care', icon: 'heart', color: '#F472B6' },
  { name: 'Subscriptions', icon: 'repeat', color: '#818CF8' },
  { name: 'Family', icon: 'people', color: '#FB923C' },
  { name: 'Emergency', icon: 'alert-circle', color: '#DC2626' },
  { name: 'Other', icon: 'ellipsis-horizontal', color: '#94A3B8' },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase', color: '#059669' },
  { name: 'Freelance', icon: 'laptop', color: '#0D9488' },
  { name: 'Business', icon: 'storefront', color: '#0891B2' },
  { name: 'Allowance', icon: 'wallet', color: '#65A30D' },
  { name: 'Bonus', icon: 'gift', color: '#CA8A04' },
  { name: 'Gift', icon: 'ribbon', color: '#DB2777' },
  { name: 'Investment', icon: 'trending-up', color: '#7C3AED' },
  { name: 'Other', icon: 'ellipsis-horizontal', color: '#94A3B8' },
] as const;
