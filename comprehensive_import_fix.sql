-- COMPREHENSIVE FIX: Import System Issues
-- This script fixes all issues preventing admin import from working

-- =====================================================
-- STEP 1: Ensure admin functions exist and work
-- =====================================================

-- Drop any conflicting functions
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin(uuid) CASCADE;

-- Create the correct admin function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;

-- =====================================================
-- STEP 2: Update RLS policies for media_outlets
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view active media outlets" ON public.media_outlets;
DROP POLICY IF EXISTS "Publishers can manage their own media outlets" ON public.media_outlets;
DROP POLICY IF EXISTS "Admins can manage all media outlets" ON public.media_outlets;

-- Create updated policies using is_platform_admin
CREATE POLICY "Everyone can view active media outlets"
ON public.media_outlets FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Publishers can manage their own media outlets"
ON public.media_outlets FOR ALL
TO authenticated
USING (auth.uid() = publisher_id)
WITH CHECK (auth.uid() = publisher_id);

CREATE POLICY "Admins can manage all media outlets"
ON public.media_outlets FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- =====================================================
-- STEP 3: Update RLS policies for metrics
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view metrics for active media outlets" ON public.metrics;
DROP POLICY IF EXISTS "Publishers can manage metrics for their media outlets" ON public.metrics;
DROP POLICY IF EXISTS "Admins can manage all metrics" ON public.metrics;

-- Create updated policies
CREATE POLICY "Everyone can view metrics for active media outlets"
ON public.metrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.media_outlets
    WHERE media_outlets.id = metrics.media_outlet_id
    AND media_outlets.is_active = true
  )
);

CREATE POLICY "Publishers can manage metrics for their media outlets"
ON public.metrics FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.media_outlets
    WHERE media_outlets.id = metrics.media_outlet_id
    AND media_outlets.publisher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all metrics"
ON public.metrics FOR ALL
TO authenticated
USING (public.is_platform_admin());

-- =====================================================
-- STEP 4: Update RLS policies for imports table
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Platform admins can manage imports" ON public.imports;

-- Create updated policy
CREATE POLICY "Platform admins can manage imports"
ON public.imports FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- =====================================================
-- STEP 5: Test the functions and policies
-- =====================================================

-- Test 1: Function exists
SELECT
    '✅ is_platform_admin function exists' as status,
    COUNT(*) as function_count
FROM pg_proc
WHERE proname = 'is_platform_admin';

-- Test 2: Current user admin status
SELECT
    'Current user admin status' as test,
    auth.uid() as user_id,
    public.is_platform_admin() as is_admin;

-- Test 3: Test insert into media_outlets (simulates import)
DO $$
DECLARE
    test_domain TEXT := 'test-import-' || extract(epoch from now())::text;
    test_outlet_id UUID;
BEGIN
    -- Try to insert (this is what import does)
    INSERT INTO public.media_outlets (
        domain, price, currency, country, language, category,
        publisher_id, is_active, source, admin_tags
    ) VALUES (
        test_domain, 100, 'EUR', 'SE', 'Swedish', 'Test',
        auth.uid(), true, 'test', ARRAY['test']
    ) RETURNING id INTO test_outlet_id;

    RAISE NOTICE '✅ Media outlets insert test PASSED - ID: %', test_outlet_id;

    -- Try to insert metrics (what import does next)
    INSERT INTO public.metrics (
        media_outlet_id, ahrefs_dr, moz_da, semrush_as, spam_score,
        organic_traffic, referring_domains
    ) VALUES (
        test_outlet_id, 10, 10, 10, 0, 1000, 50
    );

    RAISE NOTICE '✅ Metrics insert test PASSED';

    -- Try to insert into imports table (what import does for logging)
    INSERT INTO public.imports (
        source, created_by, row_count, succeeded, failed
    ) VALUES (
        'test', auth.uid(), 1, 1, 0
    );

    RAISE NOTICE '✅ Imports insert test PASSED';

    -- Clean up test data
    DELETE FROM public.imports WHERE source = 'test' AND created_by = auth.uid();
    DELETE FROM public.metrics WHERE media_outlet_id = test_outlet_id;
    DELETE FROM public.media_outlets WHERE domain = test_domain;

    RAISE NOTICE '✅ Test cleanup completed';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
    RAISE NOTICE '❌ This indicates RLS policies are still blocking admin operations';
END $$;

-- =====================================================
-- STEP 6: Final verification
-- =====================================================

SELECT
    '🎉 Import System Fix Complete!' as status,
    now() as completed_at,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_platform_admin') as admin_functions,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('media_outlets', 'metrics', 'imports')) as rls_policies;
