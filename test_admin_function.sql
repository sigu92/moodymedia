-- Test if is_user_admin function exists
SELECT
    'Function exists check' as test,
    COUNT(*) as function_count
FROM pg_proc
WHERE proname = 'is_user_admin';

-- Test the function with a mock UUID (will fail but shows if function exists)
DO $$
BEGIN
    -- This will show if the function exists and what error it gives
    RAISE NOTICE 'Testing is_user_admin function...';
    PERFORM public.is_user_admin('550e8400-e29b-41d4-a716-446655440000');
    RAISE NOTICE 'Function call succeeded';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Function call failed: %', SQLERRM;
END $$;
