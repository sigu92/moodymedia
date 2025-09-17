-- Phase 1: Consolidate User Roles and Fix RLS
-- Merge user_roles and user_role_assignments into a single unified system

-- First, check if user_roles table exists and migrate data if it does
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
    -- Migrate data from user_roles to user_role_assignments
    INSERT INTO public.user_role_assignments (user_id, role)
    SELECT user_id, role FROM public.user_roles
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Drop the old user_roles table (data is now in user_role_assignments)
    DROP TABLE public.user_roles CASCADE;
    
    RAISE NOTICE 'Migrated data from user_roles to user_role_assignments and dropped user_roles table';
  ELSE
    RAISE NOTICE 'user_roles table does not exist, skipping migration';
  END IF;
END;
$$;

-- Add buyer role to all existing users who don't have it
INSERT INTO public.user_role_assignments (user_id, role)
SELECT DISTINCT user_id, 'buyer'::app_role
FROM public.user_role_assignments
WHERE user_id NOT IN (
    SELECT user_id FROM public.user_role_assignments WHERE role = 'buyer'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update RLS policies for user_role_assignments to be more secure
-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Platform admins can manage all role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Users can self-assign publisher role" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Users can insert their own buyer role during signup" ON public.user_role_assignments;
DROP POLICY IF EXISTS "System admins can manage all role assignments" ON public.user_role_assignments;

-- New secure policies
CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own buyer role during signup"
ON public.user_role_assignments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('buyer'::app_role, 'publisher'::app_role)
);

-- Fixed: Remove the problematic admin policy that causes infinite recursion
-- We'll handle admin permissions differently to avoid circular dependencies

-- Create helper function for role checking
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_id = user_uuid
    AND role::text = role_name
  );
$$;

-- Create function to get user roles as array
CREATE OR REPLACE FUNCTION public.get_user_roles_array(user_uuid uuid DEFAULT auth.uid())
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role::text ORDER BY role::text)
  FROM public.user_role_assignments
  WHERE user_id = COALESCE(user_uuid, auth.uid());
$$;
