-- Migration: 20261028000005_grant_username_resolution.sql
-- Description: Grant execute on get_email_by_username_internal to anon and authenticated to support username-based login.

GRANT EXECUTE ON FUNCTION public.get_email_by_username_internal(text) TO anon, authenticated;
