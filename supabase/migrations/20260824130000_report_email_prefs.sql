-- Finance report email prefs (auto-send to auth email via Edge Function)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS report_email_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_email_period TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS report_email_last_sent_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_report_email_period_check
    CHECK (report_email_period IN ('daily', 'weekly', 'monthly', 'yearly'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.profiles.report_email_enabled IS
  'When true, PeraKita emails finance reports to the user auth email on the chosen period.';
COMMENT ON COLUMN public.profiles.report_email_period IS
  'Report cadence: daily | weekly | monthly | yearly';
