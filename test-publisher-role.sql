-- Test script to verify publisher role assignment
-- Run this in Supabase SQL Editor to debug the issue

-- 1. Check current user roles (replace with your user ID)
-- SELECT * FROM public.user_role_assignments WHERE user_id = 'your-user-id-here';

-- 2. Test the add_publisher_role function directly
-- SELECT public.add_publisher_role('your-user-id-here');

-- 3. Check all roles in the system
SELECT
    ura.user_id,
    ura.role,
    ura.created_at,
    u.email,
    u.created_at as user_created_at
FROM public.user_role_assignments ura
JOIN auth.users u ON ura.user_id = u.id
ORDER BY ura.created_at DESC;

-- 4. Check if the add_publisher_role function exists
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'add_publisher_role'
AND routine_schema = 'public';

-- 5. Check the user_role_assignments table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_role_assignments'
AND table_schema = 'public'
ORDER BY ordinal_position;

