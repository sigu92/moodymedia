-- Phase 1c: Update RLS policies to use is_platform_admin()

-- Update media_outlets admin policy
DROP POLICY IF EXISTS "Admins can manage all media outlets" ON public.media_outlets;
CREATE POLICY "Platform admins can manage all media outlets"
ON public.media_outlets
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update metrics admin policy  
DROP POLICY IF EXISTS "Admins can manage all metrics" ON public.metrics;
CREATE POLICY "Platform admins can manage all metrics"
ON public.metrics
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update orders admin policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Platform admins can manage all orders"
ON public.orders
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update listings admin policy
DROP POLICY IF EXISTS "Admins can manage all listings" ON public.listings;
CREATE POLICY "Platform admins can manage all listings"
ON public.listings
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update activity_feed admin policy
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_feed;
CREATE POLICY "Platform admins can view all activity"
ON public.activity_feed
FOR SELECT
USING (is_platform_admin());

-- Update user_roles admin policy
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
CREATE POLICY "Platform admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update profiles admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_platform_admin());

-- Update organizations admin policy
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
CREATE POLICY "Platform admins can manage organizations"
ON public.organizations
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());