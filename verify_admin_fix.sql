-- VERIFY ADMIN FIX: Check if moodymannen@gmail.com has admin rights
-- Run this in Supabase SQL Editor

-- 1. Check user and their roles
SELECT
    'USER STATUS CHECK' as check_type,
    u.id as user_id,
    u.email,
    array_agg(ura.role ORDER BY ura.role) as roles,
    CASE
        WHEN array_agg(ura.role) @> ARRAY['system_admin'::app_role] THEN 'SYSTEM_ADMIN'
        WHEN array_agg(ura.role) @> ARRAY['admin'::app_role] THEN 'ADMIN'
        ELSE 'NO_ADMIN_RIGHTS'
    END as admin_status
FROM auth.users u
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE u.email = 'moodymannen@gmail.com'
GROUP BY u.id, u.email;

-- 2. Test is_platform_admin function directly
SELECT
    'FUNCTION TEST' as check_type,
    u.id as user_id,
    u.email,
    public.is_platform_admin(u.id) as is_admin_with_id,
    public.is_platform_admin() as is_admin_without_id
FROM auth.users u
WHERE u.email = 'moodymannen@gmail.com';

-- 3. Check if function exists and is correct
SELECT
    'FUNCTION EXISTS' as check_type,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as parameters,
    obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname = 'is_platform_admin'
AND pg_function_is_visible(oid);

-- 4. Show function source code
SELECT
    'FUNCTION SOURCE' as check_type,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_platform_admin'
AND pg_function_is_visible(oid);

-- 5. Check Edge Function deployment status
-- (This would need to be checked in Supabase Dashboard -> Edge Functions)
-- Look for 'admin-import-batch' and check if it shows "Deployed" with recent timestamp
