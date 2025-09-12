-- Database Verification Script
-- Run this in Supabase SQL Editor to check current database state

-- 1. Check if all required tables exist
SELECT 
  'Tables Check' as check_type,
  table_name,
  CASE 
    WHEN table_name IN ('user_role_assignments', 'profiles', 'activity_feed', 'organizations') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_role_assignments', 'profiles', 'activity_feed', 'organizations', 'user_roles')
ORDER BY table_name;

-- 2. Check if old user_roles table is gone
SELECT 
  'Old Table Check' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ user_roles table properly removed'
    ELSE '❌ user_roles table still exists - needs cleanup'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_roles';

-- 3. Check table structures
SELECT 
  'Table Structure Check' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('user_role_assignments', 'profiles', 'activity_feed')
ORDER BY table_name, ordinal_position;

-- 4. Check if all required functions exist
SELECT 
  'Functions Check' as check_type,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IN ('handle_secure_user_signup', 'user_has_role', 'get_user_roles_array', 'get_complete_user_profile', 'verify_user_system_health') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_secure_user_signup', 'user_has_role', 'get_user_roles_array', 'get_complete_user_profile', 'verify_user_system_health')
ORDER BY routine_name;

-- 5. Check RLS policies on user_role_assignments
SELECT 
  'RLS Policies Check' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_role_assignments'
ORDER BY policyname;

-- 6. Check indexes
SELECT 
  'Indexes Check' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('user_role_assignments', 'profiles', 'activity_feed')
ORDER BY tablename, indexname;

-- 7. Check data integrity
SELECT 
  'Data Integrity Check' as check_type,
  'user_role_assignments' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT role) as unique_roles
FROM public.user_role_assignments
UNION ALL
SELECT 
  'Data Integrity Check' as check_type,
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  NULL as unique_roles
FROM public.profiles;

-- 8. Check for orphaned records
SELECT 
  'Data Integrity Check' as check_type,
  'orphaned_profiles' as issue,
  COUNT(*) as count
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_role_assignments ura
  WHERE ura.user_id = p.user_id
)
UNION ALL
SELECT 
  'Data Integrity Check' as check_type,
  'orphaned_role_assignments' as issue,
  COUNT(*) as count
FROM public.user_role_assignments ura
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.user_id = ura.user_id
);

-- 9. Test the secure signup function (if it exists)
DO $$
DECLARE
  test_result json;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_secure_user_signup' AND routine_schema = 'public') THEN
    -- Test with a dummy UUID to see if function works
    SELECT public.handle_secure_user_signup(
      '00000000-0000-0000-0000-000000000000'::uuid,
      'test@example.com',
      'buyer',
      null
    ) INTO test_result;
    
    RAISE NOTICE '✅ handle_secure_user_signup function test result: %', test_result;
  ELSE
    RAISE NOTICE '❌ handle_secure_user_signup function does not exist';
  END IF;
END;
$$;

-- 10. Run system health check (if function exists)
DO $$
DECLARE
  health_result json;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'verify_user_system_health' AND routine_schema = 'public') THEN
    SELECT public.verify_user_system_health() INTO health_result;
    RAISE NOTICE '✅ System Health Check Result: %', health_result;
  ELSE
    RAISE NOTICE '❌ verify_user_system_health function does not exist';
  END IF;
END;
$$;

