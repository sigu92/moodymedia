-- Add unique constraint to user_roles table if it doesn't exist
-- First, check if the constraint exists and add it if needed
DO $$ 
BEGIN
    -- Add unique constraint on user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_key' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Now assign roles to existing users
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT auth.users.id, 'buyer'::app_role
FROM auth.users
LEFT JOIN public.user_roles ON auth.users.id = public.user_roles.user_id
WHERE public.user_roles.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update users who own media outlets to publisher role
UPDATE public.user_roles 
SET role = 'publisher'::app_role
WHERE user_id IN (
    SELECT DISTINCT publisher_id 
    FROM public.media_outlets 
    WHERE publisher_id IS NOT NULL
);