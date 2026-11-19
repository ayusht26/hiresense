-- Migration: 20261119000000_add_job_screening_thresholds.sql
-- Description: Add configurable resume_threshold and interview_threshold to public.jobs with default 60.

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS resume_threshold integer NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS interview_threshold integer NOT NULL DEFAULT 60;

-- Ensure all existing jobs have default 60 threshold
UPDATE public.jobs
SET resume_threshold = 60
WHERE resume_threshold IS NULL;

UPDATE public.jobs
SET interview_threshold = 60
WHERE interview_threshold IS NULL;
