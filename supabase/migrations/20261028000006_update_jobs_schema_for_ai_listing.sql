-- Migration: 20261028000006_update_jobs_schema_for_ai_listing.sql
-- Description: Update public.jobs to support AI structured listing with optional fields, salary display, audit trail, and strict recruiter RLS.

ALTER TABLE public.jobs ALTER COLUMN location DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN work_mode DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN job_type DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN experience DROP NOT NULL;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_work_mode_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_work_mode_check CHECK (work_mode IS NULL OR work_mode IN ('remote', 'hybrid', 'onsite'));

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_display text NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS model_name text NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS prompt_version text NULL;

-- Enforce recruiter role on insert and update
DROP POLICY IF EXISTS "Recruiters insert own jobs" ON public.jobs;
CREATE POLICY "Recruiters insert own jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    recruiter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('recruiter', 'admin')
    )
  );

DROP POLICY IF EXISTS "Recruiters update own jobs" ON public.jobs;
CREATE POLICY "Recruiters update own jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    recruiter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('recruiter', 'admin')
    )
  )
  WITH CHECK (
    recruiter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('recruiter', 'admin')
    )
  );

