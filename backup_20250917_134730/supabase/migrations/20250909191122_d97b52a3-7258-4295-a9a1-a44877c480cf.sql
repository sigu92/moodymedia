-- Add system_admin role to simon@moodymedia.se
INSERT INTO public.user_role_assignments (user_id, role)
SELECT id, 'system_admin'::app_role 
FROM auth.users 
WHERE email = 'simon@moodymedia.se'
ON CONFLICT (user_id, role) DO NOTHING;