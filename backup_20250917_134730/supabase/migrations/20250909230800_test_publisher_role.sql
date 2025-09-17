-- Test migration to verify publisher role assignment
-- This can be safely run to test the functionality

DO $$
DECLARE
    test_user_id uuid := '00000000-0000-0000-0000-000000000001'; -- Dummy ID for testing
    result_record record;
BEGIN
    RAISE NOTICE 'Testing publisher role assignment...';

    -- Test 1: Check if function exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'add_publisher_role'
        AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'add_publisher_role function does not exist';
    END IF;

    RAISE NOTICE '✅ add_publisher_role function exists';

    -- Test 2: Show current roles in system (for debugging)
    RAISE NOTICE 'Current user roles in system:';
    FOR result_record IN
        SELECT u.email, ura.role, ura.created_at
        FROM auth.users u
        LEFT JOIN public.user_role_assignments ura ON u.id = ura.user_id
        ORDER BY u.created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '  User: %, Role: %, Created: %',
            COALESCE(result_record.email, 'NULL'),
            COALESCE(result_record.role::text, 'NULL'),
            COALESCE(result_record.created_at::text, 'NULL');
    END LOOP;

    -- Test 3: Show table structure
    RAISE NOTICE 'user_role_assignments table structure:';
    FOR result_record IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_role_assignments'
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  Column: %, Type: %, Nullable: %',
            result_record.column_name,
            result_record.data_type,
            result_record.is_nullable;
    END LOOP;

    RAISE NOTICE 'Test completed successfully. Check the logs above for debugging information.';
END $$;

