-- PeraKita initial cloud schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Replace a dashboard starter `profiles` table (id = auth.users.id, no user_id).
-- CREATE TABLE IF NOT EXISTS would skip our schema and then RLS policies fail.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_id'
  ) THEN
    DROP TABLE public.profiles CASCADE;
  END IF;
END $$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_currency TEXT NOT NULL DEFAULT 'PHP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PHP',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_sync ON public.accounts(user_id, sync_status);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounts_select ON public.accounts;
DROP POLICY IF EXISTS accounts_insert ON public.accounts;
DROP POLICY IF EXISTS accounts_update ON public.accounts;
CREATE POLICY accounts_select ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY accounts_insert ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY accounts_update ON public.accounts FOR UPDATE USING (auth.uid() = user_id);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(user_id, type);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_select ON public.categories;
DROP POLICY IF EXISTS categories_insert ON public.categories;
DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_select ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY categories_insert ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY categories_update ON public.categories FOR UPDATE USING (auth.uid() = user_id);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  category_id UUID REFERENCES public.categories(id),
  type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  notes TEXT,
  transaction_date DATE NOT NULL,
  transfer_to_account_id UUID REFERENCES public.accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sync ON public.transactions(user_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_transactions_updated ON public.transactions(user_id, updated_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_select ON public.transactions;
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
DROP POLICY IF EXISTS transactions_update ON public.transactions;
CREATE POLICY transactions_select ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY transactions_insert ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY transactions_update ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

-- Sync queue
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status ON public.sync_queue(user_id, status);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sync_queue_select ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_insert ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_update ON public.sync_queue;
CREATE POLICY sync_queue_select ON public.sync_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sync_queue_insert ON public.sync_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sync_queue_update ON public.sync_queue FOR UPDATE USING (auth.uid() = user_id);

-- Device sessions
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_sessions_select ON public.device_sessions;
DROP POLICY IF EXISTS device_sessions_insert ON public.device_sessions;
DROP POLICY IF EXISTS device_sessions_update ON public.device_sessions;
CREATE POLICY device_sessions_select ON public.device_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY device_sessions_insert ON public.device_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY device_sessions_update ON public.device_sessions FOR UPDATE USING (auth.uid() = user_id);

-- App settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode TEXT NOT NULL DEFAULT 'system',
  default_currency TEXT NOT NULL DEFAULT 'PHP',
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_settings_select ON public.app_settings;
DROP POLICY IF EXISTS app_settings_insert ON public.app_settings;
DROP POLICY IF EXISTS app_settings_update ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY app_settings_insert ON public.app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY app_settings_update ON public.app_settings FOR UPDATE USING (auth.uid() = user_id);

-- Stub: budgets (Phase 4)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budgets_select ON public.budgets;
DROP POLICY IF EXISTS budgets_insert ON public.budgets;
DROP POLICY IF EXISTS budgets_update ON public.budgets;
CREATE POLICY budgets_select ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY budgets_insert ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY budgets_update ON public.budgets FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  limit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budget_categories_select ON public.budget_categories;
DROP POLICY IF EXISTS budget_categories_insert ON public.budget_categories;
DROP POLICY IF EXISTS budget_categories_update ON public.budget_categories;
CREATE POLICY budget_categories_select ON public.budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY budget_categories_insert ON public.budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY budget_categories_update ON public.budget_categories FOR UPDATE USING (auth.uid() = user_id);

-- Stub: loans (Phase 5)
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  person_contact TEXT,
  loan_type TEXT NOT NULL,
  principal_amount NUMERIC(14,2) NOT NULL,
  interest_rate NUMERIC(8,4) DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(14,2) NOT NULL,
  start_date DATE,
  due_date DATE,
  payment_frequency TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_loans_user_status ON public.loans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON public.loans(user_id, due_date);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loans_select ON public.loans;
DROP POLICY IF EXISTS loans_insert ON public.loans;
DROP POLICY IF EXISTS loans_update ON public.loans;
CREATE POLICY loans_select ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY loans_insert ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY loans_update ON public.loans FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.loan_payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loan_payments_select ON public.loan_payments;
DROP POLICY IF EXISTS loan_payments_insert ON public.loan_payments;
DROP POLICY IF EXISTS loan_payments_update ON public.loan_payments;
CREATE POLICY loan_payments_select ON public.loan_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY loan_payments_insert ON public.loan_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY loan_payments_update ON public.loan_payments FOR UPDATE USING (auth.uid() = user_id);
