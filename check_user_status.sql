-- Check current status of moodymannen@gmail.com
-- Run this in your Supabase SQL Editor to verify user status

SELECT
    u.id as user_id,
    u.email,
    u.created_at,
    array_agg(ura.role ORDER BY ura.role) as roles,
    CASE WHEN array_agg(ura.role) @> ARRAY['system_admin'::app_role] THEN 'YES' ELSE 'NO' END as is_system_admin
FROM auth.users u
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE u.email = 'moodymannen@gmail.com'
GROUP BY u.id, u.email, u.created_at;
