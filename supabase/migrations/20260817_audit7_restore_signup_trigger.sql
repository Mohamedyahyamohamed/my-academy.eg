-- Audit 7 corrective migration: restore defensive profile creation.
-- The trigger must never block auth signup; application flows may upsert the
-- complete academy/profile relationship after authentication.

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  target_academy uuid;
  requested_role public.user_role;
BEGIN
  IF (NEW.raw_user_meta_data ->> 'academy_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    target_academy := (NEW.raw_user_meta_data ->> 'academy_id')::uuid;
  ELSE
    SELECT id INTO target_academy
    FROM public.academies
    ORDER BY created_at
    LIMIT 1;
  END IF;

  requested_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::public.user_role,
    'STUDENT'::public.user_role
  );

  IF target_academy IS NOT NULL THEN
    INSERT INTO public.profiles (id, academy_id, email, full_name, role)
    VALUES (
      NEW.id,
      target_academy,
      COALESCE(NEW.email, ''),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        split_part(COALESCE(NEW.email, 'u@x'), '@', 1)
      ),
      requested_role
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation; the application can complete the profile later.
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
-- Trigger execution does not require a client EXECUTE grant.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

COMMENT ON FUNCTION private.handle_new_user() IS
  'Defensive auth signup trigger: creates or refreshes a profile when academy context is available and never blocks signup.';

SELECT 'audit7 signup trigger restored' AS status;

-- NOTE: Auth leaked-password protection remains a hosted Auth configuration
-- setting and must be verified in Supabase Dashboard when an authenticated
-- dashboard session is available; it is intentionally not changed here.

-- Rollback:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
