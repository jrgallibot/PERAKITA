-- Link expenses to an optional budget. NULL = expense log only (not counted in any budget).
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_budget_id
  ON public.transactions (user_id, budget_id)
  WHERE deleted_at IS NULL AND budget_id IS NOT NULL;
