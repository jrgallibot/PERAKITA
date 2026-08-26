ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'flag-outline',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.savings_contributions
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL,
  reached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(goal_id, percentage)
);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON public.goal_milestones(goal_id);

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS goal_milestones_select ON public.goal_milestones;
DROP POLICY IF EXISTS goal_milestones_insert ON public.goal_milestones;
DROP POLICY IF EXISTS goal_milestones_update ON public.goal_milestones;
CREATE POLICY goal_milestones_select ON public.goal_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY goal_milestones_insert ON public.goal_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY goal_milestones_update ON public.goal_milestones FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_goals BOOLEAN NOT NULL DEFAULT true;
