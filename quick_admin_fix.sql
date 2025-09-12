-- QUICK ADMIN FIX FOR IMPORT ISSUE
-- Replace YOUR_EMAIL_HERE with your actual email address

DO $$
DECLARE
    target_user_id uuid;
    target_email text := 'moodymannen@gmail.com';  -- YOUR EMAIL
    role_record record;
BEGIN
    -- Find the user
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Make sure you are using the correct email address.', target_email;
    END IF;

    -- Add system_admin role
    INSERT INTO public.user_role_assignments (user_id, role)
    VALUES (target_user_id, 'system_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure buyer role exists
    INSERT INTO public.user_role_assignments (user_id, role)
    VALUES (target_user_id, 'buyer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✅ Admin privileges granted to % (ID: %)', target_email, target_user_id;

    -- Show final roles
    RAISE NOTICE 'Final roles:';
    FOR role_record IN
        SELECT role FROM public.user_role_assignments
        WHERE user_id = target_user_id
        ORDER BY role
    LOOP
        RAISE NOTICE '  - %', role_record.role;
    END LOOP;
END $$;
