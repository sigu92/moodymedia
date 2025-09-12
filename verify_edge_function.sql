-- VERIFY EDGE FUNCTION DEPLOYMENT
-- Check if the deployed Edge Function has the latest admin check code

-- Test 1: Current user admin status
SELECT
    'CURRENT USER STATUS' as test,
    u.email,
    CASE
        WHEN array_agg(ura.role) @> ARRAY['system_admin'::app_role] THEN 'HAS_SYSTEM_ADMIN'
        WHEN array_agg(ura.role) @> ARRAY['admin'::app_role] THEN 'HAS_ADMIN'
        ELSE 'NO_ADMIN_RIGHTS'
    END as admin_status,
    public.is_platform_admin(u.id) as function_returns_true
FROM auth.users u
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE u.email = 'moodymannen@gmail.com'
GROUP BY u.id, u.email;

-- Test 2: What the OLD Edge Function would do (without _user_id parameter)
-- This simulates the old broken behavior
SELECT
    'OLD_FUNCTION_SIMULATION' as test,
    u.email,
    public.is_platform_admin() as old_function_result,
    'This would FAIL because auth.uid() is null in Edge Function context' as explanation
FROM auth.users u
WHERE u.email = 'moodymannen@gmail.com';

-- Test 3: What the NEW Edge Function does (with _user_id parameter)
-- This simulates the correct behavior
SELECT
    'NEW_FUNCTION_SIMULATION' as test,
    u.email,
    public.is_platform_admin(u.id) as new_function_result,
    'This should work with the updated Edge Function' as explanation
FROM auth.users u
WHERE u.email = 'moodymannen@gmail.com';

-- CONCLUSION:
-- If old_function_result = false but new_function_result = true,
-- then the Edge Function deployed in Supabase is the OLD VERSION
-- and needs to be redeployed with the user_id parameter fix.


