-- Fix search path for existing functions to address security warnings
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = 'public';