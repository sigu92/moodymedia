-- Comprehensive diagnostic for admin import issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- =====================================================
-- STEP 1: Check if is_platform_admin function exists
-- =====================================================

SELECT
    'is_platform_admin function check' as test_name,
    CASE
        WHEN proname = 'is_platform_admin' THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    pg_get_function_identity_arguments(oid) as function_signature,
    obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname = 'is_platform_admin';

-- =====================================================
-- STEP 2: Check app_role enum values
-- =====================================================

SELECT
    'app_role enum values' as test_name,
    unnest(enum_range(NULL::app_role)) as role_value
ORDER BY role_value;

-- =====================================================
-- STEP 3: Check current user roles (replace with actual user email)
-- =====================================================

-- Get user ID for a specific email (change this to the actual user)
DO $$
DECLARE
    test_user_id uuid;
    test_user_email text := 'moodymannen@gmail.com'; -- Change this to actual user
BEGIN
    -- Get user ID
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = test_user_email;

    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ User % not found', test_user_email;
        RETURN;
    END IF;

    RAISE NOTICE '🔍 Checking roles for user: % (ID: %)', test_user_email, test_user_id;

    -- Show user roles
    RAISE NOTICE 'User roles:';
    FOR role_record IN
        SELECT role FROM public.user_role_assignments
        WHERE user_id = test_user_id
        ORDER BY role
    LOOP
        RAISE NOTICE '  - %', role_record.role;
    END LOOP;

    -- Test is_platform_admin function
    RAISE NOTICE 'is_platform_admin(%): %', test_user_id, public.is_platform_admin(test_user_id);
    RAISE NOTICE 'is_platform_admin() with auth.uid: %', public.is_platform_admin();
END $$;

-- =====================================================
-- STEP 4: Test admin operations (simulated import)
-- =====================================================

DO $$
DECLARE
    test_user_id uuid;
    test_user_email text := 'moodymannen@gmail.com'; -- Change this to actual user
    test_outlet_id uuid;
BEGIN
    -- Get user ID
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = test_user_email;

    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ User % not found', test_user_email;
        RETURN;
    END IF;

    -- Simulate what the import function does
    RAISE NOTICE '🧪 Testing admin operations for user: %', test_user_email;

    -- Test 1: Can we insert into media_outlets?
    BEGIN
        INSERT INTO public.media_outlets (
            domain, price, currency, country, language, category,
            publisher_id, is_active, source, admin_tags
        ) VALUES (
            'test-admin-import-' || extract(epoch from now())::text,
            100, 'EUR', 'SE', 'Swedish', 'Test',
            test_user_id, true, 'test', ARRAY['test']
        ) RETURNING id INTO test_outlet_id;

        RAISE NOTICE '✅ Media outlets insert test PASSED - ID: %', test_outlet_id;

        -- Test 2: Can we insert into metrics?
        INSERT INTO public.metrics (
            media_outlet_id, ahrefs_dr, moz_da, semrush_as, spam_score,
            organic_traffic, referring_domains
        ) VALUES (
            test_outlet_id, 10, 10, 10, 0, 1000, 50
        );

        RAISE NOTICE '✅ Metrics insert test PASSED';

        -- Clean up test data
        DELETE FROM public.metrics WHERE media_outlet_id = test_outlet_id;
        DELETE FROM public.media_outlets WHERE id = test_outlet_id;

        RAISE NOTICE '🧹 Test cleanup completed';

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Admin operation test FAILED: %', SQLERRM;
        RAISE NOTICE 'This indicates RLS policies are blocking admin operations';
    END;
END $$;

-- =====================================================
-- STEP 5: Check RLS policies
-- =====================================================

SELECT
    'RLS Policies check' as test_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('media_outlets', 'metrics', 'imports', 'user_role_assignments')
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 6: Summary and recommendations
-- =====================================================

SELECT
    '🎯 DIAGNOSIS SUMMARY' as section,
    now() as timestamp,
    'Run this script and check the output above' as instructions;
