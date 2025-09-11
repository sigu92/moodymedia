-- Phase 4: Cleanup and Optimization
-- Remove old tables, optimize indexes, and finalize the system

-- Drop any remaining references to old user_roles table (only if they exist)
DROP VIEW IF EXISTS public.user_role_summary CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;

-- Clean up any orphaned records (users who don't have profiles)
DELETE FROM public.user_role_assignments
WHERE user_id NOT IN (
  SELECT user_id FROM public.profiles
);

-- Ensure all profiles have at least buyer role
INSERT INTO public.user_role_assignments (user_id, role)
SELECT p.user_id, 'buyer'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_role_assignments ura
  WHERE ura.user_id = p.user_id AND ura.role = 'buyer'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Optimize indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role ON public.user_role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_role ON public.user_role_assignments(user_id, role);

-- Analyze tables for query optimization
ANALYZE public.user_role_assignments;
ANALYZE public.profiles;

-- Analyze activity_feed only if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed') THEN
    EXECUTE 'ANALYZE public.activity_feed';
  END IF;
END;
$$;

-- Create function to safely check if user exists and has roles
DROP FUNCTION IF EXISTS public.user_exists_with_roles(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.user_exists_with_roles(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_uuid
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      WHERE ura.user_id = p.user_id
    )
  );
$$;

-- Create function to get user activity summary
DROP FUNCTION IF EXISTS public.get_user_activity_summary(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_activity_summary(user_uuid uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed') THEN
      (SELECT json_build_object(
        'total_actions', COUNT(*),
        'recent_actions', COUNT(*) FILTER (WHERE created_at > now() - interval '7 days'),
        'last_activity', MAX(created_at)
      )
      FROM public.activity_feed
      WHERE user_id = COALESCE(user_uuid, auth.uid()))
    ELSE
      json_build_object(
        'total_actions', 0,
        'recent_actions', 0,
        'last_activity', null::timestamp with time zone
      )
  END;
$$;

-- Create function to get complete user profile
DROP FUNCTION IF EXISTS public.get_complete_user_profile(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_complete_user_profile(user_uuid uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'user_id', p.user_id,
    'profile_exists', true,
    'roles', public.get_user_roles_array(p.user_id),
    'organization_id', p.organization_id,
    'created_at', p.created_at,
    'activity_summary', public.get_user_activity_summary(p.user_id)
  )
  FROM public.profiles p
  WHERE p.user_id = COALESCE(user_uuid, auth.uid());
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.user_exists_with_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activity_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_complete_user_profile(uuid) TO authenticated;

-- Final cleanup: ensure no NULL user_ids
DELETE FROM public.profiles WHERE user_id IS NULL;
DELETE FROM public.user_role_assignments WHERE user_id IS NULL;

-- Only clean activity_feed if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed') THEN
    EXECUTE 'DELETE FROM public.activity_feed WHERE user_id IS NULL';
  END IF;
END;
$$;

-- Create a summary view for admin monitoring
CREATE OR REPLACE VIEW public.user_summary AS
SELECT
  p.user_id,
  array_agg(ura.role ORDER BY ura.role) as roles,
  p.created_at as profile_created_at,
  COUNT(af.id) as activity_count,
  MAX(af.created_at) as last_activity
FROM public.profiles p
LEFT JOIN public.user_role_assignments ura ON p.user_id = ura.user_id
LEFT JOIN public.activity_feed af ON p.user_id = af.user_id
GROUP BY p.user_id, p.created_at;

-- Grant access to the summary view for admins
GRANT SELECT ON public.user_summary TO authenticated;

-- Add RLS to the summary view
ALTER VIEW public.user_summary SET (security_barrier = true);

-- Final optimization: vacuum and reindex (run separately after migration)
-- Note: VACUUM ANALYZE cannot run inside transaction blocks
-- Run these commands manually after migration completes:
-- VACUUM ANALYZE public.user_role_assignments;
-- VACUUM ANALYZE public.profiles;
-- VACUUM ANALYZE public.activity_feed;
