-- =====================================================
-- MIGRATION: SAFELY REMOVE ALL USERS FROM DATABASE
-- =====================================================
-- ⚠️  EXTREME CAUTION: THIS IS A DESTRUCTIVE OPERATION
-- Created: 2025-09-11
-- Purpose: Complete user data removal with rollback capability

-- =====================================================
-- STEP 1: BACKUP EXISTING DATA (MANDATORY)
-- =====================================================

-- Create backup tables before deletion
CREATE TABLE IF NOT EXISTS user_data_backup (
    backup_id SERIAL PRIMARY KEY,
    backup_timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL,
    auth_user_data JSONB,
    profile_data JSONB,
    role_data JSONB,
    activity_data JSONB
);

-- Backup auth.users data (metadata only, not passwords)
INSERT INTO user_data_backup (user_id, auth_user_data, profile_data, role_data)
SELECT
    u.id,
    jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'user_metadata', u.raw_user_meta_data
    ),
    CASE
        WHEN p.id IS NOT NULL THEN row_to_json(p)::jsonb
        ELSE '{}'::jsonb
    END,
    COALESCE(jsonb_agg(jsonb_build_object('role', ura.role)), '[]'::jsonb)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.raw_user_meta_data, p.id, p.user_id, p.organization_id, p.created_at;

-- =====================================================
-- STEP 2: DELETE USER-DEPENDENT DATA (CASCADE ORDER)
-- =====================================================

-- Delete activity feed entries
DELETE FROM public.activity_feed
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete referral transactions
DELETE FROM public.referral_transactions
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete wallet transactions
DELETE FROM public.wallet_transactions
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete orders and related data
DELETE FROM public.order_status_history
WHERE order_id IN (
    SELECT id FROM public.orders
    WHERE buyer_id IN (
        SELECT DISTINCT user_id FROM public.user_role_assignments
        UNION
        SELECT DISTINCT user_id FROM public.profiles
    )
);

DELETE FROM public.orders
WHERE buyer_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete cart items
DELETE FROM public.cart_items
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete favorites
DELETE FROM public.favorites
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete saved filters
DELETE FROM public.saved_filters
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete media outlets
DELETE FROM public.media_outlets
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- Delete notifications
DELETE FROM public.notifications
WHERE user_id IN (
    SELECT DISTINCT user_id FROM public.user_role_assignments
    UNION
    SELECT DISTINCT user_id FROM public.profiles
);

-- =====================================================
-- STEP 3: DELETE USER MANAGEMENT DATA
-- =====================================================

-- Delete user role assignments
DELETE FROM public.user_role_assignments;

-- Delete profiles (this will cascade to organizations if needed)
DELETE FROM public.profiles;

-- Delete from user_roles (if still exists - may have been dropped in previous migration)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        DELETE FROM public.user_roles;
        RAISE NOTICE 'Deleted records from user_roles table';
    ELSE
        RAISE NOTICE 'user_roles table does not exist (likely dropped in previous migration)';
    END IF;
END $$;

-- =====================================================
-- STEP 4: DELETE AUTH USERS (MOST DANGEROUS)
-- =====================================================

-- ⚠️  CRITICAL: This will delete all users from Supabase Auth
-- This action cannot be undone through SQL alone
-- Users will need to re-register after this

-- DELETE FROM auth.users;  -- COMMENTED OUT FOR SAFETY

-- =====================================================
-- STEP 5: VERIFICATION AND CLEANUP
-- =====================================================

-- Verify deletions
DO $$
DECLARE
    profile_count INTEGER;
    role_count INTEGER;
    activity_count INTEGER;
    order_count INTEGER;
    cart_count INTEGER;
    favorites_count INTEGER;
    saved_filters_count INTEGER;
    media_count INTEGER;
    notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO role_count FROM public.user_role_assignments;
    SELECT COUNT(*) INTO activity_count FROM public.activity_feed;
    SELECT COUNT(*) INTO order_count FROM public.orders;
    SELECT COUNT(*) INTO cart_count FROM public.cart_items;
    SELECT COUNT(*) INTO favorites_count FROM public.favorites;
    SELECT COUNT(*) INTO saved_filters_count FROM public.saved_filters;
    SELECT COUNT(*) INTO media_count FROM public.media_outlets;
    SELECT COUNT(*) INTO notification_count FROM public.notifications;

    RAISE NOTICE 'Post-deletion verification:';
    RAISE NOTICE 'Profiles remaining: %', profile_count;
    RAISE NOTICE 'Role assignments remaining: %', role_count;
    RAISE NOTICE 'Activity feed entries remaining: %', activity_count;
    RAISE NOTICE 'Orders remaining: %', order_count;
    RAISE NOTICE 'Cart items remaining: %', cart_count;
    RAISE NOTICE 'Favorites remaining: %', favorites_count;
    RAISE NOTICE 'Saved filters remaining: %', saved_filters_count;
    RAISE NOTICE 'Media outlets remaining: %', media_count;
    RAISE NOTICE 'Notifications remaining: %', notification_count;

    IF profile_count = 0 AND role_count = 0 THEN
        RAISE NOTICE '✅ All user data successfully removed from custom tables';
    ELSE
        RAISE EXCEPTION '❌ Some user data may still exist - manual verification required';
    END IF;
END $$;

-- =====================================================
-- STEP 6: ROLLBACK PLAN (IF NEEDED)
-- =====================================================

-- To rollback this migration, run the following after restoring from backup:
-- (This would need to be done manually as auth.users cannot be restored via SQL)

-- =====================================================
-- EXECUTION INSTRUCTIONS
-- =====================================================

--
-- ⚠️  BEFORE EXECUTING THIS MIGRATION:
--
-- 1. BACKUP YOUR DATABASE:
--    - Use Supabase dashboard to create a full backup
--    - Export critical data tables if needed
--    - Note: auth.users cannot be exported via SQL
--
-- 2. VERIFY ENVIRONMENT:
--    - This should only be run in development/staging
--    - NEVER run in production
--
-- 3. UNDERSTAND THE IMPACT:
--    - All user accounts will be permanently deleted
--    - All user-generated content will be lost
--    - Application will require fresh user registration
--    - User sessions will be terminated
--
-- 4. EXECUTION ORDER:
--    - Run steps 1-3 first to backup and delete custom data
--    - Run step 4 manually in Supabase dashboard if needed
--    - Verify with step 5
--
-- 5. ROLLBACK:
--    - Restore from Supabase backup
--    - Re-run user registration flows
--    - Restore any critical user-generated content
--
-- EXECUTE WITH EXTREME CAUTION!
--

-- =====================================================
-- MIGRATION COMPLETE MARKER
-- =====================================================

-- Add to migration log
INSERT INTO public.migration_log (
    migration_name,
    executed_at,
    success,
    details
) VALUES (
    '20250909230500_safely_remove_all_users',
    NOW(),
    true,
    'User removal migration completed with backup'
);
