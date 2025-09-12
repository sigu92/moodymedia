-- COMPREHENSIVE FIX FOR ADMIN IMPORT ISSUE
-- Run this in Supabase SQL Editor to fix all issues

-- =====================================================
-- STEP 1: Ensure is_user_admin function exists (from recent migration)
-- =====================================================

-- This should already exist from migration 20250909235000_fix_rls_infinite_recursion.sql
-- But let's verify and recreate if needed

DROP FUNCTION IF EXISTS public.is_user_admin(uuid);
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_count integer;
BEGIN
  -- Direct query without RLS to avoid recursion
  SELECT COUNT(*) INTO admin_role_count
  FROM public.user_role_assignments
  WHERE user_id = user_uuid
  AND role IN ('admin'::app_role, 'system_admin'::app_role);

  RETURN admin_role_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;

-- =====================================================
-- STEP 2: Grant admin privileges to current user
-- =====================================================

-- Option 1: Grant admin to specific email (change the email below)
-- Option 2: Use current authenticated user (see Option 2 below)

DO $$
DECLARE
    target_user_id uuid;
    target_email text := 'moodymannen@gmail.com'; -- CHANGE THIS TO YOUR ACTUAL USER EMAIL
    role_record record;  -- Declare as record type for FOR loop
BEGIN
    -- Find the user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please update the email in this script.', target_email;
    END IF;

    -- Add system_admin role
    INSERT INTO public.user_role_assignments (user_id, role)
    VALUES (target_user_id, 'system_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure buyer role also exists
    INSERT INTO public.user_role_assignments (user_id, role)
    VALUES (target_user_id, 'buyer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✅ Admin privileges granted to % (ID: %)', target_email, target_user_id;

    -- Show final roles
    RAISE NOTICE 'Final roles for user:';
    FOR role_record IN
        SELECT role FROM public.user_role_assignments
        WHERE user_id = target_user_id
        ORDER BY role
    LOOP
        RAISE NOTICE '  - %', role_record.role;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Verify admin function works
-- =====================================================

SELECT
    'Admin function verification' as test,
    public.is_user_admin() as current_user_is_admin;

-- =====================================================
-- STEP 4: Test admin operations (simulate import)
-- =====================================================

DO $$
DECLARE
    test_user_id uuid := auth.uid();
    test_outlet_id uuid;
BEGIN
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found';
        RETURN;
    END IF;

    RAISE NOTICE '🧪 Testing admin operations for current user...';

    -- Test media_outlets insert
    BEGIN
        INSERT INTO public.media_outlets (
            domain, price, currency, country, language, category,
            publisher_id, is_active, source, admin_tags
        ) VALUES (
            'test-admin-fix-' || extract(epoch from now())::text,
            100, 'EUR', 'SE', 'Swedish', 'Test',
            test_user_id, true, 'test', ARRAY['test']
        ) RETURNING id INTO test_outlet_id;

        RAISE NOTICE '✅ Media outlets insert: PASSED';

        -- Test metrics insert
        INSERT INTO public.metrics (
            media_outlet_id, ahrefs_dr, moz_da, semrush_as, spam_score,
            organic_traffic, referring_domains
        ) VALUES (
            test_outlet_id, 10, 10, 10, 0, 1000, 50
        );

        RAISE NOTICE '✅ Metrics insert: PASSED';

        -- Test imports table insert
        INSERT INTO public.imports (
            source, created_by, row_count, succeeded, failed
        ) VALUES (
            'test', test_user_id, 1, 1, 0
        );

        RAISE NOTICE '✅ Imports insert: PASSED';

        -- Clean up
        DELETE FROM public.imports WHERE source = 'test' AND created_by = test_user_id;
        DELETE FROM public.metrics WHERE media_outlet_id = test_outlet_id;
        DELETE FROM public.media_outlets WHERE id = test_outlet_id;

        RAISE NOTICE '🧹 Test cleanup completed';

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Admin operation test FAILED: %', SQLERRM;
        RAISE NOTICE 'This indicates RLS policies are still blocking operations';
    END;
END $$;

-- =====================================================
-- OPTION 2: Grant admin to CURRENT AUTHENTICATED USER
-- =====================================================

-- NOTE: This option only works when run from WITHIN the app (not SQL Editor)
-- The SQL Editor doesn't have authentication context.
-- Use Option 1 instead and specify your email address.

-- For reference only - run this in app console if needed:
-- console.log('Current user ID:', supabase.auth.getUser().then(({data}) => data.user?.id))

-- =====================================================
-- STEP 5: Final verification
-- =====================================================

SELECT
    '🎉 COMPREHENSIVE ADMIN FIX COMPLETE' as status,
    now() as completed_at,
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email,
    public.is_user_admin() as is_current_user_admin,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_user_admin') as admin_function_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('media_outlets', 'metrics', 'imports')) as rls_policies_count;
