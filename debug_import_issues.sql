-- DEBUG: Check all policies and functions related to import functionality

-- 1. Check if is_platform_admin function exists and works
SELECT
    'is_platform_admin function exists' as check_name,
    COUNT(*) as count
FROM pg_proc
WHERE proname = 'is_platform_admin';

-- 2. Test is_platform_admin function (will show current user's admin status)
SELECT
    'Current user is admin' as check_name,
    auth.uid() as current_user_id,
    public.is_platform_admin() as is_admin;

-- 3. Check media_outlets policies
SELECT
    'media_outlets policies' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'media_outlets'
ORDER BY policyname;

-- 4. Check metrics policies
SELECT
    'metrics policies' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'metrics'
ORDER BY policyname;

-- 5. Check imports policies
SELECT
    'imports policies' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'imports'
ORDER BY policyname;

-- 6. Check user roles
SELECT
    'Current user roles' as check_name,
    ura.role
FROM public.user_role_assignments ura
WHERE ura.user_id = auth.uid();

-- 7. Test media_outlets insert (what the import tries to do)
-- This will fail if RLS blocks it, showing us the exact issue
DO $$
DECLARE
    test_domain TEXT := 'test-import-domain-' || extract(epoch from now())::text;
BEGIN
    INSERT INTO public.media_outlets (
        domain, price, currency, country, language, category,
        publisher_id, is_active, source, admin_tags
    ) VALUES (
        test_domain, 100, 'EUR', 'SE', 'Swedish', 'Test',
        auth.uid(), true, 'test', ARRAY['test']
    );

    RAISE NOTICE '✅ Test insert succeeded for domain: %', test_domain;

    -- Clean up test record
    DELETE FROM public.media_outlets WHERE domain = test_domain AND source = 'test';
    RAISE NOTICE '✅ Test cleanup completed';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
END $$;
