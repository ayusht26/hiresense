-- Migration: 20261028000000_init_auth_and_schema.sql
-- Description: Core auth, profiles, roles, storage buckets, RLS, jobs and applications schema for HireSense.

-- 1. Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. User role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'recruiter', 'admin');
  END IF;
END $$;

-- 3. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'student',
  full_name text NOT NULL,
  username text NOT NULL,
  email text NOT NULL,
  avatar_url text NULL,
  avatar_step_done boolean NOT NULL DEFAULT false,
  company_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_.]{3,20}$')
);

-- Indexes for profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- updated_at trigger for profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Field tampering protection on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_field_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user <> 'postgres' AND current_user <> 'service_role' THEN
    IF NEW.id <> OLD.id THEN
      RAISE EXCEPTION 'Changing profile ID is not permitted';
    END IF;
    IF NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Changing your own role is not permitted';
    END IF;
    IF NEW.email <> OLD.email THEN
      RAISE EXCEPTION 'Changing profile email is not permitted directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_field_protection ON public.profiles;
CREATE TRIGGER enforce_profile_field_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_field_tampering();

-- 5. Before Insert Trigger on auth.users to ensure role in raw_app_meta_data
CREATE OR REPLACE FUNCTION public.ensure_user_app_metadata_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role_name text;
BEGIN
  v_role_name := coalesce(NEW.raw_app_meta_data->>'role', 'student');
  IF v_role_name NOT IN ('student', 'recruiter', 'admin') THEN
    v_role_name := 'student';
  END IF;

  NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ensure_role ON auth.users;
CREATE TRIGGER on_auth_user_created_ensure_role
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_app_metadata_role();

-- 6. After Insert Trigger on auth.users to create profile
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role public.user_role;
  v_role_text text;
  v_full_name text;
  v_username text;
  v_company_name text;
  v_email text;
BEGIN
  v_role_text := coalesce(NEW.raw_app_meta_data->>'role', 'student');
  IF v_role_text = 'recruiter' THEN
    v_role := 'recruiter'::public.user_role;
  ELSIF v_role_text = 'admin' THEN
    v_role := 'admin'::public.user_role;
  ELSE
    v_role := 'student'::public.user_role;
  END IF;

  v_full_name := trim(coalesce(NEW.raw_user_meta_data->>'full_name', ''));
  v_username := trim(coalesce(NEW.raw_user_meta_data->>'username', ''));
  v_company_name := trim(coalesce(NEW.raw_user_meta_data->>'company_name', ''));
  v_email := coalesce(NEW.email, '');

  IF v_username = '' THEN
    v_username := split_part(v_email, '@', 1);
    v_username := regexp_replace(v_username, '[^a-zA-Z0-9_.]', '', 'g');
    IF length(v_username) < 3 THEN
      v_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    IF length(v_username) > 20 THEN
      v_username := substr(v_username, 1, 20);
    END IF;
  END IF;

  IF v_full_name = '' THEN
    v_full_name := v_username;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(v_username)) THEN
    RAISE EXCEPTION 'USERNAME_ALREADY_EXISTS: Username "%" is already taken.', v_username;
  END IF;

  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    username,
    email,
    avatar_url,
    avatar_step_done,
    company_name
  ) VALUES (
    NEW.id,
    v_role,
    v_full_name,
    v_username,
    v_email,
    NULL,
    (v_role = 'recruiter' OR v_role = 'admin'),
    CASE WHEN v_company_name <> '' THEN v_company_name ELSE NULL END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 7. RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 8. RPC is_username_available
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_username IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (p_username ~ '^[a-zA-Z0-9_.]{3,20}$') THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(p_username)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated, service_role;

-- 9. Internal server RPC to resolve username to email (restricted to service_role only)
CREATE OR REPLACE FUNCTION public.get_email_by_username_internal(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(username) = lower(p_username)
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_email_by_username_internal(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username_internal(text) TO service_role;

-- 10. Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  5242880, -- 5 MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Storage RLS (enabled by default on storage.objects in Supabase)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Students can access own resume files" ON storage.objects;
CREATE POLICY "Students can access own resume files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 11. Foundation tables: jobs and applications
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  title text NOT NULL,
  salary_min numeric NULL,
  salary_max numeric NULL,
  salary_currency text NOT NULL DEFAULT 'INR',
  salary_period text NOT NULL DEFAULT 'month',
  location text NOT NULL,
  work_mode text NOT NULL,
  job_type text NOT NULL,
  experience text NOT NULL,
  raw_input text NULL,
  generated_posting jsonb NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_status_check CHECK (status IN ('draft', 'published', 'closed')),
  CONSTRAINT jobs_work_mode_check CHECK (work_mode IN ('remote', 'hybrid', 'onsite'))
);

CREATE INDEX IF NOT EXISTS jobs_recruiter_id_idx ON public.jobs (recruiter_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON public.jobs (status);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON public.jobs (created_at DESC);

DROP TRIGGER IF EXISTS set_jobs_updated_at ON public.jobs;
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_path text NULL,
  status text NOT NULL DEFAULT 'applied',
  result_published boolean NOT NULL DEFAULT false,
  match_score numeric NULL,
  match_report jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_job_student_unique UNIQUE (job_id, student_id),
  CONSTRAINT applications_status_check CHECK (status IN ('applied', 'under_review', 'shortlisted', 'rejected', 'selected'))
);

CREATE INDEX IF NOT EXISTS applications_job_id_idx ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS applications_student_id_idx ON public.applications (student_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications (status);
CREATE INDEX IF NOT EXISTS applications_resume_path_idx ON public.applications (resume_path);

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 12. RLS on jobs and applications
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read published jobs" ON public.jobs;
CREATE POLICY "Authenticated users read published jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Recruiters manage own jobs" ON public.jobs;
CREATE POLICY "Recruiters manage own jobs"
  ON public.jobs
  FOR ALL
  TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students insert own application" ON public.applications;
CREATE POLICY "Students insert own application"
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students read own applications" ON public.applications;
CREATE POLICY "Students read own applications"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Recruiters view applications for their jobs" ON public.applications;
CREATE POLICY "Recruiters view applications for their jobs"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
      AND j.recruiter_id = auth.uid()
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
      AND j.recruiter_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
      AND j.recruiter_id = auth.uid()
    )
  );

-- Resumes recruiter access policy:
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
      AND j.recruiter_id = auth.uid()
    )
  );
