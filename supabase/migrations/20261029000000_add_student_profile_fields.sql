-- Migration: 20261029000000_add_student_profile_fields.sql
-- Description: Add age, university, degree to profiles table and allow reading profiles.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age integer NULL,
ADD COLUMN IF NOT EXISTS university text NULL,
ADD COLUMN IF NOT EXISTS degree text NULL;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

