-- Migration: 20261028000002_optimize_rls_policies.sql
-- Description: Optimize RLS policies using (SELECT auth.uid()) to avoid per-row re-evaluation.

-- 1. Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- 2. Jobs
DROP POLICY IF EXISTS "Authenticated users read published jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters manage own jobs" ON public.jobs;

-- Combine SELECT into one policy to resolve multiple_permissive_policies warning:
CREATE POLICY "Users view published jobs or own jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (status = 'published' OR recruiter_id = (SELECT auth.uid()));

CREATE POLICY "Recruiters insert own jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (recruiter_id = (SELECT auth.uid()));

CREATE POLICY "Recruiters update own jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (recruiter_id = (SELECT auth.uid()))
  WITH CHECK (recruiter_id = (SELECT auth.uid()));

CREATE POLICY "Recruiters delete own jobs"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (recruiter_id = (SELECT auth.uid()));

-- 3. Applications
DROP POLICY IF EXISTS "Students insert own application" ON public.applications;
CREATE POLICY "Students insert own application"
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students read own applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters view applications for their jobs" ON public.applications;

-- Combine SELECT into one policy for applications:
CREATE POLICY "Users view permitted applications"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
      AND j.recruiter_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Recruiters update applications for their jobs" ON public.applications;
CREATE POLICY "Recruiters update applications for their jobs"
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
      AND j.recruiter_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
      AND j.recruiter_id = (SELECT auth.uid())
    )
  );

-- 4. Storage objects optimization
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Students can access own resume files" ON storage.objects;
CREATE POLICY "Students can access own resume files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'resumes' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Recruiters can read candidate resumes for their jobs" ON storage.objects;
CREATE POLICY "Recruiters can read candidate resumes for their jobs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.applications app
      JOIN public.jobs j ON j.id = app.job_id
      WHERE app.resume_path = storage.objects.name
      AND j.recruiter_id = (SELECT auth.uid())
    )
  );

