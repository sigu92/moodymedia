-- SIMPLE: Make moodymannen@gmail.com a system admin
-- This version is simpler and more reliable

-- Step 1: Add system_admin role (safe, won't create duplicates)
INSERT INTO public.user_role_assignments (user_id, role)
SELECT id, 'system_admin'::app_role
FROM auth.users
WHERE email = 'moodymannen@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.users.id
    AND ura.role = 'system_admin'::app_role
);

-- Step 2: Verify the result
SELECT
    u.email,
    u.id as user_id,
    array_agg(ura.role ORDER BY ura.role) as roles,
    CASE WHEN array_agg(ura.role) @> ARRAY['system_admin'::app_role] THEN 'SYSTEM ADMIN ✅' ELSE 'NOT ADMIN ❌' END as admin_status
FROM auth.users u
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE u.email = 'moodymannen@gmail.com'
GROUP BY u.id, u.email;
