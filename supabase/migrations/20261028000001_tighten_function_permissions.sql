-- Migration: 20261028000001_tighten_function_permissions.sql
-- Description: Revoke direct execution on internal trigger functions from anon and authenticated.

REVOKE EXECUTE ON FUNCTION public.ensure_user_app_metadata_role() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_field_tampering() FROM public, anon, authenticated;

