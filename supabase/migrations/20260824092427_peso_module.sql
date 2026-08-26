-- PESO module: financial profiles, recurring expenses, savings goals, achievements

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;

CREATE TABLE IF NOT EXISTS public.financial_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'PHP',
  current_money NUMERIC(14,2) NOT NULL DEFAULT 0,
  income_source TEXT,
  income_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  income_frequency TEXT NOT NULL DEFAULT 'monthly',
  next_payday DATE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_financial_profiles_user ON public.financial_profiles(user_id);

ALTER TABLE public.financial_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_profiles_select ON public.financial_profiles;
DROP POLICY IF EXISTS financial_profiles_insert ON public.financial_profiles;
DROP POLICY IF EXISTS financial_profiles_update ON public.financial_profiles;
CREATE POLICY financial_profiles_select ON public.financial_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY financial_profiles_insert ON public.financial_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY financial_profiles_update ON public.financial_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  frequency TEXT NOT NULL DEFAULT 'monthly',
  custom_interval_days INTEGER,
  next_due_date DATE NOT NULL,
  payment_method TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user ON public.recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_due ON public.recurring_expenses(user_id, next_due_date);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recurring_expenses_select ON public.recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_insert ON public.recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_update ON public.recurring_expenses;
CREATE POLICY recurring_expenses_select ON public.recurring_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY recurring_expenses_insert ON public.recurring_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY recurring_expenses_update ON public.recurring_expenses FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS savings_goals_select ON public.savings_goals;
DROP POLICY IF EXISTS savings_goals_insert ON public.savings_goals;
DROP POLICY IF EXISTS savings_goals_update ON public.savings_goals;
CREATE POLICY savings_goals_select ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY savings_goals_insert ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY savings_goals_update ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.savings_contributions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  contribution_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON public.savings_contributions(goal_id);

ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS savings_contributions_select ON public.savings_contributions;
DROP POLICY IF EXISTS savings_contributions_insert ON public.savings_contributions;
DROP POLICY IF EXISTS savings_contributions_update ON public.savings_contributions;
CREATE POLICY savings_contributions_select ON public.savings_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY savings_contributions_insert ON public.savings_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY savings_contributions_update ON public.savings_contributions FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.emergency_fund_targets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  recommended_target NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.emergency_fund_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emergency_fund_targets_select ON public.emergency_fund_targets;
DROP POLICY IF EXISTS emergency_fund_targets_insert ON public.emergency_fund_targets;
DROP POLICY IF EXISTS emergency_fund_targets_update ON public.emergency_fund_targets;
CREATE POLICY emergency_fund_targets_select ON public.emergency_fund_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY emergency_fund_targets_insert ON public.emergency_fund_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY emergency_fund_targets_update ON public.emergency_fund_targets FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_achievements_select ON public.user_achievements;
DROP POLICY IF EXISTS user_achievements_insert ON public.user_achievements;
DROP POLICY IF EXISTS user_achievements_update ON public.user_achievements;
CREATE POLICY user_achievements_select ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_achievements_insert ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_achievements_update ON public.user_achievements FOR UPDATE USING (auth.uid() = user_id);

INSERT INTO public.achievements (code, title, description, icon) VALUES
  ('first_expense', 'First Expense', 'Recorded your first expense', 'receipt'),
  ('first_1000_saved', 'First ₱1,000 Saved', 'Saved at least ₱1,000 toward a goal', 'wallet'),
  ('seven_days_under_budget', '7 Days Under Budget', 'Stayed under budget for 7 days', 'checkmark-circle'),
  ('debt_paid_on_time', 'Paid Debt On Time', 'Made a debt payment on time', 'hand-left'),
  ('goal_completed', 'Completed Savings Goal', 'Reached a savings goal', 'trophy'),
  ('reduced_spending', 'Reduced Spending', 'Spending dropped below your average', 'trending-down')
ON CONFLICT (code) DO NOTHING;
