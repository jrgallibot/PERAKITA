-- In-app and mobile push notification preferences (profiles)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_bills BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_loans BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_budget BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_safe_to_spend BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.notify_enabled IS 'Master toggle for bill/loan/budget/safe-to-spend reminders.';
COMMENT ON COLUMN public.profiles.notify_bills IS 'Remind about recurring expense due dates.';
COMMENT ON COLUMN public.profiles.notify_loans IS 'Remind about loan payment due dates.';
COMMENT ON COLUMN public.profiles.notify_budget IS 'Warn when a budget reaches 85%+ usage.';
COMMENT ON COLUMN public.profiles.notify_safe_to_spend IS 'Daily safe-to-spend reminder (mobile push).';
