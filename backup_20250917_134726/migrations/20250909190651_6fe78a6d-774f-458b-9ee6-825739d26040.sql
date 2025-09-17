-- First, let's see what roles currently exist
SELECT DISTINCT role FROM user_roles;

-- Create a new table for multiple user roles
CREATE TABLE public.user_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on the new table
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for the new table
CREATE POLICY "Platform admins can manage all role assignments" 
ON public.user_role_assignments 
FOR ALL 
TO authenticated
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

CREATE POLICY "Users can view their own role assignments" 
ON public.user_role_assignments 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Migrate existing roles to the new table
INSERT INTO public.user_role_assignments (user_id, role)
SELECT user_id, role FROM public.user_roles;

-- Add buyer role to all publishers (since they should be able to buy too)
INSERT INTO public.user_role_assignments (user_id, role)
SELECT user_id, 'buyer'::app_role 
FROM public.user_roles 
WHERE role = 'publisher'::app_role
ON CONFLICT (user_id, role) DO NOTHING;

-- Add buyer role to all admins (since they should be able to buy too)
INSERT INTO public.user_role_assignments (user_id, role)
SELECT user_id, 'buyer'::app_role 
FROM public.user_roles 
WHERE role IN ('admin'::app_role, 'system_admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update functions to work with multiple roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid DEFAULT auth.uid())
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY_AGG(role ORDER BY role)
  FROM public.user_role_assignments
  WHERE user_id = COALESCE(_user_id, auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Update platform admin function to check the new table
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments
    WHERE user_id = COALESCE(_user_id, auth.uid())
    AND role IN ('admin'::app_role, 'system_admin'::app_role)
  )
$$;