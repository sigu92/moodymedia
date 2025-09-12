-- QUICK TEST: Check if admin can perform import operations

-- 1. Check admin status
SELECT
    'Admin Status Check' as test,
    auth.uid() as user_id,
    public.is_platform_admin() as is_admin;

-- 2. Check user roles
SELECT
    'User Roles' as test,
    role
FROM public.user_role_assignments
WHERE user_id = auth.uid();

-- 3. Try to insert into media_outlets (what import does)
DO $$
BEGIN
    RAISE NOTICE 'Testing media_outlets insert...';
    INSERT INTO public.media_outlets (
        domain, price, currency, country, language, category,
        publisher_id, is_active, source
    ) VALUES (
        'test-admin-insert-' || extract(epoch from now())::text,
        100, 'EUR', 'SE', 'Swedish', 'Test',
        auth.uid(), true, 'test'
    );
    RAISE NOTICE '✅ media_outlets insert succeeded';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ media_outlets insert failed: %', SQLERRM;
END $$;

-- 4. Check RLS policies on media_outlets
SELECT
    'media_outlets policies' as table_check,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'media_outlets';
