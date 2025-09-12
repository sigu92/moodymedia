-- FIX: Remove duplicate/conflicting admin functions and create clean ones

-- Step 1: Drop ALL existing admin functions to avoid conflicts
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_user_admin(uuid) CASCADE;

-- Step 2: Create clean admin functions
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments
    WHERE user_id = COALESCE(_user_id, auth.uid())
    AND role IN ('admin'::app_role, 'system_admin'::app_role)
  )
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;

-- Step 4: Verify the function works
SELECT
    '✅ Admin Functions Fixed!' as status,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_platform_admin') as function_count,
    public.is_platform_admin() as current_user_is_admin;
