-- Make moodymannen@gmail.com a system admin
-- Run this in your Supabase SQL Editor

DO $$
DECLARE
    target_user_id uuid;
    already_admin boolean;
    role_record record;  -- Declare as record type for FOR loop
BEGIN
    -- Find the user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'moodymannen@gmail.com';

    -- Check if user exists
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email moodymannen@gmail.com not found in auth.users';
    END IF;

    -- Check if user already has system_admin role
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_id = target_user_id
        AND role = 'system_admin'::app_role
    ) INTO already_admin;

    IF already_admin THEN
        RAISE NOTICE 'User moodymannen@gmail.com is already a system admin';
    ELSE
        -- Add system_admin role
        INSERT INTO public.user_role_assignments (user_id, role)
        VALUES (target_user_id, 'system_admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Successfully added system_admin role to moodymannen@gmail.com (user_id: %)', target_user_id;
    END IF;

    -- Show all roles for this user
    RAISE NOTICE 'Current roles for moodymannen@gmail.com:';
    FOR role_record IN
        SELECT role FROM public.user_role_assignments
        WHERE user_id = target_user_id
        ORDER BY role
    LOOP
        RAISE NOTICE '  - %', role_record.role;
    END LOOP;

END $$;
