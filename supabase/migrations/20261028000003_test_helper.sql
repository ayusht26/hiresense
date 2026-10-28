-- Migration: 20261028000003_test_helper.sql
-- Description: Helper function to confirm test user emails for automated test suites.

CREATE OR REPLACE FUNCTION public.confirm_test_user(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF p_email LIKE 'hiresense.student.%' OR p_email LIKE 'hiresense.test.%' THEN
    UPDATE auth.users SET email_confirmed_at = now() WHERE email = p_email;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_test_user(text) TO anon, authenticated, service_role;

