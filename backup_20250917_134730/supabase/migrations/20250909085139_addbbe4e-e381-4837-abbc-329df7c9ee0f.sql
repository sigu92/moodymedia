-- Fix missing user roles for existing users
-- This migration assigns roles based on media outlets ownership

-- First, let's assign 'buyer' as default role for users without any role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT auth.users.id, 'buyer'::app_role
FROM auth.users
LEFT JOIN public.user_roles ON auth.users.id = public.user_roles.user_id
WHERE public.user_roles.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Then, update users who own media outlets to 'publisher' role
UPDATE public.user_roles 
SET role = 'publisher'::app_role
WHERE user_id IN (
    SELECT DISTINCT publisher_id 
    FROM public.media_outlets 
    WHERE publisher_id IS NOT NULL
);

-- Create an admin user if needed (you can change this email to your admin email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'admin@moodymedia.se'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;