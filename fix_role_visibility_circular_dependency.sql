-- FIX: Role Visibility Circular Dependency Issue
-- Problem: RLS policy creates circular dependency preventing admins from seeing their roles

-- =====================================================
-- STEP 1: Fix RLS policy to avoid circular dependency
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.user_role_assignments;

-- Create new policy that allows users to ALWAYS see their own roles
-- This avoids the circular dependency with is_platform_admin()
CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Keep the admin policy for managing other users' roles
CREATE POLICY "Admins can manage other users role assignments"
ON public.user_role_assignments FOR ALL
TO authenticated
USING (
  auth.uid() != user_id  -- Not their own roles
  AND public.is_platform_admin() = true
)
WITH CHECK (
  auth.uid() != user_id  -- Not their own roles
  AND public.is_platform_admin() = true
);

-- =====================================================
-- STEP 2: Ensure system admin role exists
-- =====================================================

-- Make sure moodymannen@gmail.com has system_admin role
INSERT INTO public.user_role_assignments (user_id, role)
SELECT id, 'system_admin'::app_role
FROM auth.users
WHERE email = 'moodymannen@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.users.id
    AND ura.role = 'system_admin'::app_role
);

-- Also ensure buyer and publisher roles exist
INSERT INTO public.user_role_assignments (user_id, role)
SELECT id, 'buyer'::app_role
FROM auth.users
WHERE email = 'moodymannen@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.users.id
    AND ura.role = 'buyer'::app_role
);

INSERT INTO public.user_role_assignments (user_id, role)
SELECT id, 'publisher'::app_role
FROM auth.users
WHERE email = 'moodymannen@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.users.id
    AND ura.role = 'publisher'::app_role
);

-- =====================================================
-- STEP 3: Verify the fix
-- =====================================================

-- Check all roles for the user
SELECT
    'Fixed roles for moodymannen@gmail.com' as result,
    u.email,
    array_agg(ura.role ORDER BY ura.role) as roles,
    CASE WHEN array_agg(ura.role) @> ARRAY['system_admin'::app_role] THEN 'SYSTEM ADMIN ✅' ELSE 'NOT ADMIN ❌' END as admin_status
FROM auth.users u
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE u.email = 'moodymannen@gmail.com'
GROUP BY u.id, u.email;

-- Test that the user can now see their roles (simulates app behavior)
SELECT
    'Role visibility test' as result,
    ura.role
FROM public.user_role_assignments ura
WHERE ura.user_id = (SELECT id FROM auth.users WHERE email = 'moodymannen@gmail.com');
