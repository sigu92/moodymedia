-- SAFE FIX RLS INFINITE RECURSION ISSUE
-- This version can be run multiple times safely
-- Run this in your Supabase SQL Editor to fix the infinite recursion problem

-- =====================================================
-- STEP 1: Drop ALL existing policies (safe to run multiple times)
-- =====================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on user_role_assignments table
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'user_role_assignments'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_role_assignments', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;

    RAISE NOTICE 'All existing policies on user_role_assignments have been dropped';
END $$;

-- =====================================================
-- STEP 2: Create security definer function to check admin status
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_count integer;
BEGIN
  -- Direct query without RLS to avoid recursion
  SELECT COUNT(*) INTO admin_role_count
  FROM public.user_role_assignments
  WHERE user_id = user_uuid
  AND role IN ('admin'::app_role, 'system_admin'::app_role);

  RETURN admin_role_count > 0;
END;
$$;

-- =====================================================
-- STEP 3: Create new secure RLS policies (one by one to avoid conflicts)
-- =====================================================

-- Policy 1: Users can view their own role assignments
CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_user_admin() = true
);

-- Policy 2: Users can insert their own buyer/publisher roles during signup
CREATE POLICY "Users can insert their own buyer role during signup"
ON public.user_role_assignments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('buyer'::app_role, 'publisher'::app_role)
);

-- Policy 3: Users can update their own role assignments
CREATE POLICY "Users can update their own role assignments"
ON public.user_role_assignments FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_user_admin() = true
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_user_admin() = true
);

-- Policy 4: Admins can delete role assignments
CREATE POLICY "Admins can delete role assignments"
ON public.user_role_assignments FOR DELETE
TO authenticated
USING (public.is_user_admin() = true);

-- =====================================================
-- STEP 4: Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;

-- =====================================================
-- STEP 5: Test the fix
-- =====================================================
-- This should now work without infinite recursion
SELECT
    'RLS Policies Fixed Successfully' as status,
    now() as timestamp,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_role_assignments' AND schemaname = 'public') as policy_count;
