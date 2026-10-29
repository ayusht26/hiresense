-- Migration: 20261029000000_add_student_profile_fields.sql
-- Description: Add age, university, degree, college, hired_company, is_hired, and social links to profiles table.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age integer NULL,
ADD COLUMN IF NOT EXISTS university text NULL,
ADD COLUMN IF NOT EXISTS degree text NULL,
ADD COLUMN IF NOT EXISTS college text NULL,
ADD COLUMN IF NOT EXISTS hired_company text NULL,
ADD COLUMN IF NOT EXISTS is_hired boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS twitter_url text NULL,
ADD COLUMN IF NOT EXISTS github_url text NULL,
ADD COLUMN IF NOT EXISTS linkedin_url text NULL,
ADD COLUMN IF NOT EXISTS leetcode_url text NULL;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);
