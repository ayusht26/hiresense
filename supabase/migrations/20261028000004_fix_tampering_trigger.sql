-- Migration: 20261028000004_fix_tampering_trigger.sql
-- Description: Check auth.role() in prevent_profile_field_tampering to block authenticated clients from altering id, role, or email.

CREATE OR REPLACE FUNCTION public.prevent_profile_field_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'authenticated' OR auth.role() = 'anon' THEN
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

