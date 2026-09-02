-- Linked wallet / bank metadata on payment mode accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS masked_identifier TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_linked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS last_balance_sync_at TIMESTAMPTZ;

UPDATE public.accounts SET provider = 'cash' WHERE lower(name) = 'cash' AND provider IS NULL;
UPDATE public.accounts SET provider = 'gcash' WHERE lower(name) = 'gcash' AND provider IS NULL;
UPDATE public.accounts SET provider = 'maya' WHERE lower(name) = 'maya' AND provider IS NULL;
UPDATE public.accounts SET provider = 'bank' WHERE lower(name) = 'bank' AND provider IS NULL;
UPDATE public.accounts SET provider = 'other' WHERE provider IS NULL;
