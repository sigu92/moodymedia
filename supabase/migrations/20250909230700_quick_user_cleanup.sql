-- =====================================================
-- MIGRATION: QUICK USER CLEANUP (FOR FEW USERS)
-- =====================================================
-- ✅ SIMPLE & SAFE: For environments with only 1-2 users
-- Created: 2025-09-11
-- Purpose: Quick cleanup without complex backup procedures

-- =====================================================
-- STEP 1: LIST CURRENT USERS (VERIFICATION)
-- =====================================================

-- Show all current users before cleanup
SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    CASE WHEN p.id IS NOT NULL THEN 'Has Profile' ELSE 'No Profile' END as profile_status,
    array_agg(DISTINCT ura.role) FILTER (WHERE ura.role IS NOT NULL) as roles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, p.id
ORDER BY u.created_at DESC;

-- =====================================================
-- STEP 2: SIMPLE CLEANUP (FOR SMALL NUMBER OF USERS)
-- =====================================================

-- Delete user-dependent data in correct order
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count users first
    SELECT COUNT(*) INTO user_count FROM auth.users;

    RAISE NOTICE 'Found % users to clean up', user_count;

    IF user_count > 10 THEN
        RAISE EXCEPTION 'Too many users (%). Use selective cleanup instead.', user_count;
    END IF;

    -- Delete in dependency order
    RAISE NOTICE 'Deleting activity feed entries...';
    DELETE FROM public.activity_feed;

    RAISE NOTICE 'Deleting referral transactions...';
    DELETE FROM public.referral_transactions;

    RAISE NOTICE 'Deleting wallet transactions...';
    DELETE FROM public.wallet_transactions;

    RAISE NOTICE 'Deleting order status history...';
    DELETE FROM public.order_status_history;

    RAISE NOTICE 'Deleting orders...';
    DELETE FROM public.orders;

    RAISE NOTICE 'Deleting cart items...';
    DELETE FROM public.cart_items;

    RAISE NOTICE 'Deleting favorites...';
    DELETE FROM public.favorites;

    RAISE NOTICE 'Deleting saved filters...';
    DELETE FROM public.saved_filters;

    RAISE NOTICE 'Deleting media outlets...';
    DELETE FROM public.media_outlets;

    RAISE NOTICE 'Deleting notifications...';
    DELETE FROM public.notifications;

    RAISE NOTICE 'Deleting user role assignments...';
    DELETE FROM public.user_role_assignments;

    RAISE NOTICE 'Deleting profiles...';
    DELETE FROM public.profiles;

    RAISE NOTICE 'Deleting user roles (if exists)...';
    -- Note: user_roles table may have been dropped in previous migration
    PERFORM 1 WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles');
    IF FOUND THEN
        DELETE FROM public.user_roles;
        RAISE NOTICE 'Deleted records from user_roles table';
    ELSE
        RAISE NOTICE 'user_roles table does not exist (likely dropped in previous migration)';
    END IF;

    RAISE NOTICE '✅ All user data deleted successfully';

    -- Show final state
    RAISE NOTICE 'Final verification:';
    RAISE NOTICE '- Profiles remaining: %', (SELECT COUNT(*) FROM public.profiles);
    RAISE NOTICE '- Role assignments remaining: %', (SELECT COUNT(*) FROM public.user_role_assignments);
    RAISE NOTICE '- Orders remaining: %', (SELECT COUNT(*) FROM public.orders);
    RAISE NOTICE '- Cart items remaining: %', (SELECT COUNT(*) FROM public.cart_items);
    RAISE NOTICE '- Favorites remaining: %', (SELECT COUNT(*) FROM public.favorites);
    RAISE NOTICE '- Saved filters remaining: %', (SELECT COUNT(*) FROM public.saved_filters);
    RAISE NOTICE '- Media outlets remaining: %', (SELECT COUNT(*) FROM public.media_outlets);
    RAISE NOTICE '- Notifications remaining: %', (SELECT COUNT(*) FROM public.notifications);

END $$;

-- =====================================================
-- STEP 3: OPTIONAL - DELETE AUTH USERS MANUALLY
-- =====================================================

-- ⚠️  MANUAL STEP: Delete from auth.users
-- This cannot be done via SQL function due to security restrictions
-- Must be done via Supabase Dashboard > Authentication > Users

-- To delete auth users manually:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Select each user and click "Delete"
-- 4. Confirm deletion

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

-- Verify cleanup was successful
SELECT
    'Profiles' as table_name, COUNT(*) as remaining_records FROM public.profiles
UNION ALL
SELECT 'User Role Assignments', COUNT(*) FROM public.user_role_assignments
UNION ALL
SELECT 'Orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'Media Outlets', COUNT(*) FROM public.media_outlets
UNION ALL
SELECT 'Activity Feed', COUNT(*) FROM public.activity_feed
UNION ALL
SELECT 'Notifications', COUNT(*) FROM public.notifications
UNION ALL
SELECT 'Auth Users', COUNT(*) FROM auth.users
ORDER BY table_name;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- =====================================================

--
-- If you need to rollback this cleanup:
--
-- 1. IMMEDIATE ROLLBACK (within same session):
--    - If you haven't deleted auth.users yet, you can restore from backup
--    - Use Supabase Dashboard backup/restore feature
--
-- 2. FULL ROLLBACK (after auth.users deletion):
--    - Restore entire database from Supabase backup
--    - Or manually recreate users and their data
--    - This requires having made a backup before running this migration
--
-- 3. PREVENTION:
--    - Always create a full Supabase backup before running user cleanup
--    - Test in development environment first
--

-- =====================================================
-- EXECUTION SUMMARY
-- =====================================================

INSERT INTO public.migration_log (
    migration_name,
    executed_at,
    success,
    details
) VALUES (
    '20250909230700_quick_user_cleanup',
    NOW(),
    true,
    'Quick user cleanup completed - manual auth.users deletion required'
);
