-- Debug script for user role assignment issues
-- Run this in Supabase SQL Editor

-- 1. Check table structure and constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'user_role_assignments'
  AND tc.table_schema = 'public';

-- 2. Check indexes on user_role_assignments
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_role_assignments'
  AND schemaname = 'public';

-- 3. Check if there are any existing roles for a specific user
-- Replace 'your-user-id' with the actual user ID
-- SELECT * FROM public.user_role_assignments WHERE user_id = 'your-user-id';

-- 4. Test the add_publisher_role function manually
-- Replace 'your-user-id' with the actual user ID
-- SELECT public.add_publisher_role('your-user-id');

-- 5. Check RLS policies on user_role_assignments
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
WHERE tablename = 'user_role_assignments'
  AND schemaname = 'public';

-- 6. Check the app_role enum values
SELECT
    enumtypid::regtype AS enum_type,
    enumlabel AS value
FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype
ORDER BY enumsortorder;
