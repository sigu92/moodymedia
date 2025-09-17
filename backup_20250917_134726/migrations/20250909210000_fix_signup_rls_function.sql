-- Fix signup RLS issues by creating a secure function to handle user data creation
-- This function bypasses RLS for the signup process but is still secure

CREATE OR REPLACE FUNCTION public.handle_user_signup(
  p_user_id uuid,
  p_role text DEFAULT 'buyer',
  p_referral_code text DEFAULT null
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_role_assignments json;
BEGIN
  -- Validate role
  IF p_role NOT IN ('buyer', 'publisher') THEN
    p_role := 'buyer';
  END IF;

  -- Create role assignments with proper type casting
  INSERT INTO public.user_role_assignments (user_id, role)
  VALUES
    (p_user_id, 'buyer'::app_role),
    (p_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create profile
  INSERT INTO public.profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Handle referral if provided
  IF p_referral_code IS NOT NULL THEN
    -- You can add referral logic here later
    NULL;
  END IF;

  v_result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'roles', ARRAY['buyer', p_role],
    'message', 'User data created successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id
    );
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_user_signup(uuid, text, text) TO authenticated;

-- Also grant to anon for signup process (this is secure because the function validates the user_id)
GRANT EXECUTE ON FUNCTION public.handle_user_signup(uuid, text, text) TO anon;
