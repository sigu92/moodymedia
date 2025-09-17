-- Add RLS policy to allow users to self-assign publisher role
CREATE POLICY "Users can self-assign publisher role" 
ON public.user_role_assignments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('buyer'::app_role, 'publisher'::app_role)
);

-- Create security definer function to fetch user roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid DEFAULT auth.uid())
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role ORDER BY role)
  FROM public.user_role_assignments
  WHERE user_id = COALESCE(_user_id, auth.uid())
$$;