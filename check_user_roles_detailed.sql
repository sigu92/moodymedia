-- DETAILED CHECK: User roles and RLS status

-- 1. Check what roles actually exist in the database for moodymannen@gmail.com
SELECT
    'Database roles for moodymannen@gmail.com' as check_type,
    u.email,
    u.id as user_id,
    array_agg(ura.role ORDER BY ura.role) as actual_roles
FROM auth.users u
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE u.email = 'moodymannen@gmail.com'
GROUP BY u.id, u.email;

-- 2. Check if the user can see their own roles (simulated as if logged in)
-- This simulates what happens when the user queries their roles
SELECT
    'Simulated role query result' as check_type,
    ura.role
FROM public.user_role_assignments ura
WHERE ura.user_id = (
    SELECT id FROM auth.users WHERE email = 'moodymannen@gmail.com'
);

-- 3. Check current RLS policies on user_role_assignments
SELECT
    'RLS Policies on user_role_assignments' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_role_assignments'
ORDER BY policyname;

-- 4. Test the is_platform_admin function directly
SELECT
    'is_platform_admin function test' as check_type,
    (SELECT id FROM auth.users WHERE email = 'moodymannen@gmail.com') as user_id,
    public.is_platform_admin((SELECT id FROM auth.users WHERE email = 'moodymannen@gmail.com')) as is_admin_for_user;

-- 5. Check if there are any duplicate or conflicting role entries
SELECT
    'Role entries analysis' as check_type,
    user_id,
    role,
    COUNT(*) as count
FROM public.user_role_assignments
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'moodymannen@gmail.com')
GROUP BY user_id, role
HAVING COUNT(*) > 1;
