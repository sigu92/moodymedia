-- EMERGENCY ADMIN FIX: Force add admin role to moodymannen@gmail.com
-- Run this in Supabase SQL Editor if verification shows no admin rights

-- STEP 1: Add system_admin role (most permissive)
INSERT INTO public.user_role_assignments (user_id, role)
SELECT id, 'system_admin'::app_role
FROM auth.users
WHERE email = 'moodymannen@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- STEP 2: Also add admin role for redundancy
INSERT INTO public.user_role_assignments (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'moodymannen@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- STEP 3: Verify the fix worked
SELECT
    'AFTER FIX' as status,
    u.id as user_id,
    u.email,
    array_agg(ura.role ORDER BY ura.role) as roles,
    CASE
        WHEN array_agg(ura.role) @> ARRAY['system_admin'::app_role] THEN '✅ SYSTEM_ADMIN'
        WHEN array_agg(ura.role) @> ARRAY['admin'::app_role] THEN '✅ ADMIN'
        ELSE '❌ NO_ADMIN_RIGHTS'
    END as admin_status,
    public.is_platform_admin(u.id) as function_returns
FROM auth.users u
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE u.email = 'moodymannen@gmail.com'
GROUP BY u.id, u.email;

-- STEP 4: Test the function call that Edge Function uses
SELECT
    'FUNCTION TEST' as test,
    u.email,
    public.is_platform_admin(u.id) as with_user_id,
    public.is_platform_admin() as without_user_id
FROM auth.users u
WHERE u.email = 'moodymannen@gmail.com';
