-- Verify and fix the is_user_admin function

-- First, check if it exists
SELECT
    'is_user_admin function check' as test,
    COUNT(*) as exists_count
FROM pg_proc
WHERE proname = 'is_user_admin';

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS public.is_user_admin(uuid);
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;

-- Test the function
SELECT
    'Function test - should return true for your user' as test,
    public.is_user_admin() as current_user_is_admin;

-- Show your user roles
SELECT
    'Your user roles' as info,
    ura.role
FROM public.user_role_assignments ura
WHERE ura.user_id = (SELECT id FROM auth.users WHERE email = 'moodymannen@gmail.com');