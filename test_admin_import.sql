-- Test Admin Import Functionality
-- Run this in Supabase SQL Editor to diagnose import issues

-- =====================================================
-- STEP 1: Check admin function
-- =====================================================

SELECT
    'Testing is_platform_admin function' as test,
    auth.uid() as current_user_id,
    public.is_platform_admin() as is_admin_current_user;

-- Test with a specific user ID (replace with your system admin user ID)
-- You can find this in your user_role_assignments table
SELECT user_id, role
FROM public.user_role_assignments
WHERE role IN ('system_admin', 'admin')
ORDER BY user_id;

-- =====================================================
-- STEP 2: Test admin function with specific user ID
-- =====================================================

-- Replace 'your-user-id-here' with the actual UUID from step 1
DO $$
DECLARE
    test_user_id UUID := 'your-user-id-here'; -- Replace with actual system admin user ID
    is_admin_result BOOLEAN;
BEGIN
    -- Test the function call that the Edge Function uses
    SELECT public.is_platform_admin(test_user_id) INTO is_admin_result;

    RAISE NOTICE 'Admin check for user %: %', test_user_id, is_admin_result;

    IF is_admin_result THEN
        RAISE NOTICE '✅ Admin function works correctly';
    ELSE
        RAISE NOTICE '❌ Admin function returned false - check user roles';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Test RLS policies (simulating import)
-- =====================================================

-- This simulates what the Edge Function does
DO $$
DECLARE
    test_domain TEXT;
    test_outlet_id UUID;
    test_admin_tags TEXT[] := ARRAY['moody']; -- Test with admin tags
BEGIN
    -- Generate unique test domain
    SELECT 'test-import-' || extract(epoch from now())::text INTO test_domain;

    RAISE NOTICE 'Testing import simulation with domain: %', test_domain;
    RAISE NOTICE 'Testing admin_tags: %', test_admin_tags;

    -- Test media_outlets insert (what import does)
    INSERT INTO public.media_outlets (
        domain, price, currency, country, language, category,
        publisher_id, is_active, source, admin_tags
    ) VALUES (
        test_domain, 100, 'EUR', 'SE', 'Swedish', 'Test',
        auth.uid(), true, 'test_admin_import', test_admin_tags
    ) RETURNING id INTO test_outlet_id;

    RAISE NOTICE '✅ Media outlets insert succeeded - ID: %', test_outlet_id;

    -- Test metrics insert (what import does next)
    INSERT INTO public.metrics (
        media_outlet_id, ahrefs_dr, moz_da, semrush_as, spam_score,
        organic_traffic, referring_domains
    ) VALUES (
        test_outlet_id, 10, 10, 10, 0, 1000, 50
    );

    RAISE NOTICE '✅ Metrics insert succeeded';

    -- Test imports table insert (what import does for logging)
    INSERT INTO public.imports (
        source, created_by, row_count, succeeded, failed,
        log_data
    ) VALUES (
        'test_admin_import', auth.uid(), 1, 1, 0,
        jsonb_build_object(
            'admin_tags', test_admin_tags,
            'test_domain', test_domain
        )
    );

    RAISE NOTICE '✅ Imports insert succeeded';

    -- Verify admin_tags were stored correctly
    SELECT domain, admin_tags
    FROM public.media_outlets
    WHERE domain = test_domain;

    -- Clean up test data
    DELETE FROM public.imports WHERE source = 'test_admin_import' AND created_by = auth.uid();
    DELETE FROM public.metrics WHERE media_outlet_id = test_outlet_id;
    DELETE FROM public.media_outlets WHERE domain = test_domain;

    RAISE NOTICE '✅ Test cleanup completed';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
    RAISE NOTICE '❌ SQL State: %', SQLSTATE;

    -- Still try cleanup on error
    BEGIN
        DELETE FROM public.imports WHERE source = 'test_admin_import' AND created_by = auth.uid();
        DELETE FROM public.metrics WHERE media_outlet_id IN (
            SELECT id FROM public.media_outlets WHERE domain LIKE 'test-import-%'
        );
        DELETE FROM public.media_outlets WHERE domain LIKE 'test-import-%';
        RAISE NOTICE '🧹 Cleanup attempted after error';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '🧹 Cleanup failed: %', SQLERRM;
    END;
END $$;

-- =====================================================
-- STEP 4: Check current RLS policies
-- =====================================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('media_outlets', 'metrics', 'imports')
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 5: Final status
-- =====================================================

SELECT
    'Admin Import Test Complete' as status,
    now() as completed_at,
    (SELECT COUNT(*) FROM public.user_role_assignments WHERE role IN ('system_admin', 'admin')) as admin_users,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('media_outlets', 'metrics', 'imports')) as rls_policies;


