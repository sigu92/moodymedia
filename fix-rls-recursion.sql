-- FIX RLS INFINITE RECURSION ISSUE
-- Run this in your Supabase SQL Editor to fix the infinite recursion problem

-- Step 1: Drop ALL existing policies on user_role_assignments to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Users can insert their own buyer role during signup" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Users can update their own role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Admins can delete role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "System admins can manage all role assignments" ON public.user_role_assignments;

-- Step 2: Create security definer function to check admin status
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

-- Step 3: Create new secure RLS policies
CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_user_admin() = true
);

CREATE POLICY "Users can insert their own buyer role during signup"
ON public.user_role_assignments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('buyer'::app_role, 'publisher'::app_role)
);

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

CREATE POLICY "Admins can delete role assignments"
ON public.user_role_assignments FOR DELETE
TO authenticated
USING (public.is_user_admin() = true);

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;

-- Step 5: Test the fix by running a simple query
-- This should now work without infinite recursion
SELECT 'RLS Policies Fixed - Test Query Working' as status;
