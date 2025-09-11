-- =====================================================
-- MIGRATION: SELECTIVE USER CLEANUP (RECOMMENDED)
-- =====================================================
-- ✅ SAFER ALTERNATIVE: Selective cleanup instead of complete removal
-- Created: 2025-09-11
-- Purpose: Clean up test/demo users while preserving real data

-- =====================================================
-- STEP 1: IDENTIFY TEST/DEMO USERS
-- =====================================================

-- Create temporary table to identify users for cleanup
CREATE TEMPORARY TABLE users_to_cleanup AS
SELECT DISTINCT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
WHERE
    -- Test/demo email patterns
    u.email LIKE '%test%' OR
    u.email LIKE '%demo%' OR
    u.email LIKE '%example%' OR
    u.email LIKE '%admin%' OR
    u.email LIKE '%simon@moodymedia%' OR  -- Add specific test emails
    -- Recently created accounts (last 30 days)
    u.created_at > NOW() - INTERVAL '30 days'
    -- Users with no meaningful activity
    AND NOT EXISTS (
        SELECT 1 FROM public.orders o WHERE o.buyer_id = u.id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.media_outlets mo WHERE mo.user_id = u.id
    );

-- Show users that will be cleaned up
SELECT
    id,
    email,
    created_at,
    CASE
        WHEN email LIKE '%test%' THEN 'Test account'
        WHEN email LIKE '%demo%' THEN 'Demo account'
        WHEN email LIKE '%example%' THEN 'Example account'
        WHEN email LIKE '%admin%' THEN 'Admin test account'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN 'Recent account'
        ELSE 'Low activity account'
    END as cleanup_reason
FROM users_to_cleanup
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: BACKUP SELECTED USERS (OPTIONAL)
-- =====================================================

-- Create backup only for users being cleaned up
CREATE TABLE IF NOT EXISTS selective_user_backup (
    backup_id SERIAL PRIMARY KEY,
    backup_timestamp TIMESTAMPTZ DEFAULT NOW(),
    cleanup_reason TEXT,
    user_id UUID NOT NULL,
    auth_user_data JSONB,
    profile_data JSONB,
    role_data JSONB
);

INSERT INTO selective_user_backup (user_id, auth_user_data, profile_data, role_data, cleanup_reason)
SELECT
    utc.id,
    jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'user_metadata', u.raw_user_meta_data
    ),
    COALESCE(p.row_to_json, '{}'::jsonb),
    COALESCE(jsonb_agg(jsonb_build_object('role', ura.role)), '[]'::jsonb),
    CASE
        WHEN u.email LIKE '%test%' THEN 'Test account'
        WHEN u.email LIKE '%demo%' THEN 'Demo account'
        WHEN u.email LIKE '%example%' THEN 'Example account'
        WHEN u.email LIKE '%admin%' THEN 'Admin test account'
        WHEN u.created_at > NOW() - INTERVAL '30 days' THEN 'Recent account'
        ELSE 'Low activity account'
    END
FROM users_to_cleanup utc
JOIN auth.users u ON utc.id = u.id
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
GROUP BY utc.id, u.id, u.email, u.created_at, u.last_sign_in_at, u.raw_user_meta_data, p.row_to_json;

-- =====================================================
-- STEP 3: SELECTIVE CLEANUP EXECUTION
-- =====================================================

-- Delete activity feed entries for selected users
DELETE FROM public.activity_feed
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- Delete referral transactions for selected users
DELETE FROM public.referral_transactions
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- Delete wallet transactions for selected users
DELETE FROM public.wallet_transactions
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- Delete orders for selected users
DELETE FROM public.order_items
WHERE order_id IN (
    SELECT id FROM public.orders
    WHERE buyer_id IN (SELECT id FROM users_to_cleanup)
);

DELETE FROM public.orders
WHERE buyer_id IN (SELECT id FROM users_to_cleanup);

-- Delete media outlets for selected users
DELETE FROM public.media_outlets
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- Delete notifications for selected users
DELETE FROM public.notifications
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- Delete user role assignments for selected users
DELETE FROM public.user_role_assignments
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- Delete profiles for selected users
DELETE FROM public.profiles
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- Delete from user_roles for selected users (if still exists)
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM users_to_cleanup);

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

-- Count remaining users
DO $$
DECLARE
    total_users INTEGER;
    remaining_test_users INTEGER;
    cleaned_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO remaining_test_users
    FROM auth.users u
    WHERE u.email LIKE '%test%' OR u.email LIKE '%demo%' OR u.email LIKE '%example%';

    SELECT COUNT(*) INTO cleaned_users FROM selective_user_backup;

    RAISE NOTICE 'Cleanup Summary:';
    RAISE NOTICE 'Total users remaining: %', total_users;
    RAISE NOTICE 'Remaining test/demo users: %', remaining_test_users;
    RAISE NOTICE 'Users cleaned up: %', cleaned_users;

    IF remaining_test_users = 0 THEN
        RAISE NOTICE '✅ All test/demo users successfully removed';
    ELSE
        RAISE NOTICE '⚠️  Some test/demo users still remain - manual review may be needed';
    END IF;
END $$;

-- =====================================================
-- STEP 5: CLEANUP BACKUP TABLES (OPTIONAL)
-- =====================================================

-- Keep backup for 30 days, then clean up
-- Uncomment to remove backup immediately:
-- DROP TABLE IF EXISTS selective_user_backup;

-- =====================================================
-- EXECUTION INSTRUCTIONS
-- =====================================================

--
-- ✅ RECOMMENDED APPROACH FOR DEVELOPMENT:
--
-- 1. REVIEW THE USER LIST:
--    - Check the output of the user identification query
--    - Verify no real users are included
--    - Add/remove email patterns as needed
--
-- 2. EXECUTION:
--    - Run this migration in development environment
--    - Monitor the verification output
--    - Keep backup table for rollback if needed
--
-- 3. ROLLBACK (if needed):
--    - Use Supabase dashboard to restore users from backup
--    - Or manually re-create important users
--
-- 4. PRODUCTION CONSIDERATIONS:
--    - NEVER run this in production
--    - Use proper backup strategies
--    - Consider user communication if needed
--
-- This approach is much safer than complete user removal!
--

-- =====================================================
-- MIGRATION LOG
-- =====================================================

INSERT INTO public.migration_log (
    migration_name,
    executed_at,
    success,
    details
) VALUES (
    '20250909230600_selective_user_cleanup',
    NOW(),
    true,
    'Selective user cleanup completed'
);
