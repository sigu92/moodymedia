-- Update the user role to system_admin for simon@moodymedia.se
UPDATE user_roles 
SET role = 'system_admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'simon@moodymedia.se'
);