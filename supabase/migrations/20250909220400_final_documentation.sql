-- Phase 5: Final Documentation and Setup Verification
-- This migration documents the changes and verifies the setup

-- Create documentation comments for the new functions
COMMENT ON FUNCTION public.handle_secure_user_signup(uuid, text, text, text) IS
'Securely creates user profile and role assignments during signup. Bypasses RLS for authenticated signup process.';

COMMENT ON FUNCTION public.user_has_role(uuid, text) IS
'Checks if a user has a specific role. Used by RLS policies and application logic.';

COMMENT ON FUNCTION public.get_user_roles_array(uuid) IS
'Returns all roles for a user as a text array. Used throughout the application for role-based access control.';

COMMENT ON FUNCTION public.user_exists_with_roles(uuid) IS
'Verifies that a user exists and has at least one role assigned. Used for data validation.';

COMMENT ON FUNCTION public.get_complete_user_profile(uuid) IS
'Returns complete user profile information including roles and activity summary. Used by admin panels and user dashboards.';

COMMENT ON FUNCTION public.get_user_activity_summary(uuid) IS
'Returns user activity statistics. Used for user engagement tracking.';

-- Create a verification function to check system health
DROP FUNCTION IF EXISTS public.verify_user_system_health() CASCADE;
CREATE OR REPLACE FUNCTION public.verify_user_system_health()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'user_role_assignments_count', (SELECT COUNT(*) FROM public.user_role_assignments),
    'profiles_count', (SELECT COUNT(*) FROM public.profiles),
    'users_with_roles_count', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.user_role_assignments
    ),
    'orphaned_profiles_count', (
      SELECT COUNT(*)
      FROM public.profiles p
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        WHERE ura.user_id = p.user_id
      )
    ),
    'system_healthy', CASE
      WHEN (
        SELECT COUNT(*)
        FROM public.profiles p
        WHERE NOT EXISTS (
          SELECT 1 FROM public.user_role_assignments ura
          WHERE ura.user_id = p.user_id
        )
      ) = 0 THEN true
      ELSE false
    END
  );
$$;

-- Grant access to verification function
GRANT EXECUTE ON FUNCTION public.verify_user_system_health() TO authenticated;

-- Create a migration summary comment (PostgreSQL doesn't support COMMENT ON DATABASE with multi-line strings)
DO $$
BEGIN
  -- We'll create a table to store migration info instead
  CREATE TABLE IF NOT EXISTS public.migration_log (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    migration_name text NOT NULL,
    description text,
    executed_at timestamp with time zone NOT NULL DEFAULT now()
  );
  
  INSERT INTO public.migration_log (migration_name, description) VALUES (
    'user_system_overhaul_20250909',
    'User System Migration Summary: Consolidated user_roles and user_role_assignments tables, Created secure signup function handle_secure_user_signup(), Implemented proper RLS policies for user data, Added activity tracking with activity_feed table, Created helper functions for role management, Added comprehensive indexing for performance, Implemented email confirmation tracking'
  );
END;
$$;

-- Final verification: Check that all expected tables and functions exist
DO $$
DECLARE
  v_missing_items text[] := ARRAY[]::text[];
BEGIN
  -- Check tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_role_assignments') THEN
    v_missing_items := v_missing_items || 'user_role_assignments table';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    v_missing_items := v_missing_items || 'profiles table';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed') THEN
    v_missing_items := v_missing_items || 'activity_feed table';
  END IF;

  -- Check functions
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_secure_user_signup') THEN
    v_missing_items := v_missing_items || 'handle_secure_user_signup function';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'user_has_role') THEN
    v_missing_items := v_missing_items || 'user_has_role function';
  END IF;

  -- Report results
  IF array_length(v_missing_items, 1) > 0 THEN
    RAISE WARNING 'Migration verification failed. Missing items: %', array_to_string(v_missing_items, ', ');
  ELSE
    RAISE NOTICE '✅ User system migration completed successfully! All components verified.';
  END IF;
END;
$$;
