-- Update RLS policies for media_outlets table to support marketplace manager approval workflow
-- This migration updates the Row Level Security policies to properly handle the new status field
-- and differentiate access based on user roles and submission status.

-- =====================================================
-- STEP 1: Drop existing policies
-- =====================================================

DROP POLICY IF EXISTS "Everyone can view active media outlets" ON public.media_outlets;
DROP POLICY IF EXISTS "Publishers can manage their own media outlets" ON public.media_outlets;
DROP POLICY IF EXISTS "Admins can manage all media outlets" ON public.media_outlets;

-- =====================================================
-- STEP 2: Create new RLS policies for marketplace manager
-- =====================================================

-- Policy 1: Publishers can see and manage their own submissions (all statuses)
CREATE POLICY "Publishers can manage their own submissions"
ON public.media_outlets FOR ALL
TO authenticated
USING (
  auth.uid() = publisher_id AND
  EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role IN ('publisher', 'system_admin')
  )
)
WITH CHECK (
  auth.uid() = publisher_id AND
  EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role IN ('publisher', 'system_admin')
  )
);

-- Policy 2: Buyers can view approved and active listings only
CREATE POLICY "Buyers can view approved listings"
ON public.media_outlets FOR SELECT
TO authenticated
USING (
  status IN ('approved', 'active') AND
  EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role = 'buyer'
  )
);

-- Policy 3: System admins can manage all submissions
CREATE POLICY "System admins can manage all submissions"
ON public.media_outlets FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role = 'system_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role = 'system_admin'
  )
);

-- =====================================================
-- STEP 3: Ensure RLS is enabled on media_outlets
-- =====================================================

ALTER TABLE public.media_outlets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Add comments for documentation
-- =====================================================

COMMENT ON POLICY "Publishers can manage their own submissions" ON public.media_outlets IS
'Allows publishers and system admins to view and manage their own media outlet submissions regardless of approval status';

COMMENT ON POLICY "Buyers can view approved listings" ON public.media_outlets IS
'Allows buyers to view only media outlets that have been approved or are active in the marketplace';

COMMENT ON POLICY "System admins can manage all submissions" ON public.media_outlets IS
'Allows system admins full access to all media outlet submissions for approval workflow management';
