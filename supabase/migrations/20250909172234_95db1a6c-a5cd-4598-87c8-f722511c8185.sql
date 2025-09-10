-- Update simon@moodymedia.se to system_admin role
UPDATE public.user_roles 
SET role = 'system_admin'::app_role
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'simon@moodymedia.se'
);