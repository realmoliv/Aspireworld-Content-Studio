-- ============================================================
-- Aspire World Content Studio — Lead Tracker Enhancements
-- Adds On hold, activity logs, owner, hold reasons, resume date
-- ============================================================

-- 1. Relax or update status check constraint on leads table
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'New',
    'Qualified',
    'Call booked',
    'On hold',
    'Closed',
    'No response',
    'Cancelled',
    'Lost',
    'Wrong data'
  ));

-- 2. Add new columns for lead tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS resume_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- 3. Update comments on columns
COMMENT ON COLUMN public.leads.activity_log IS 'Chronological audit and activity entries for this lead';
COMMENT ON COLUMN public.leads.hold_reason IS 'Reason if status is On hold (budget, timing, thinking)';
COMMENT ON COLUMN public.leads.resume_date IS 'Target resume date when lead is On hold';
COMMENT ON COLUMN public.leads.owner_name IS 'Cached display name of the handling team member';
