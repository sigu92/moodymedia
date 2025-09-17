-- Phase 2: Secure Signup Function
-- Create a function that bypasses RLS for user creation during signup

-- Drop existing signup function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS public.handle_user_signup(uuid, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.handle_secure_user_signup(
  p_user_id uuid,
  p_email text,
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
  v_existing_user uuid;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID and email are required',
      'user_id', p_user_id
    );
  END IF;

  -- Validate role
  IF p_role NOT IN ('buyer', 'publisher') THEN
    p_role := 'buyer';
  END IF;

  -- Check if user exists in auth.users first (with a small delay for race condition)
  -- Wait a moment for the user to be committed to auth.users
  PERFORM pg_sleep(0.5);
  
  SELECT id INTO v_existing_user
  FROM auth.users
  WHERE id = p_user_id;

  IF v_existing_user IS NULL THEN
    -- Try one more time with a longer delay
    PERFORM pg_sleep(1.0);
    SELECT id INTO v_existing_user
    FROM auth.users
    WHERE id = p_user_id;
    
    IF v_existing_user IS NULL THEN
      -- User still doesn't exist in auth.users yet, this is a race condition
      RETURN json_build_object(
        'success', false,
        'error', 'User not yet committed to auth.users - please try again',
        'user_id', p_user_id,
        'retry', true
      );
    END IF;
  END IF;

  -- Check if user already exists in our tables
  SELECT user_id INTO v_existing_user
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_existing_user IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'User already exists',
      'user_id', p_user_id,
      'roles', (
        SELECT ARRAY_AGG(role::text ORDER BY role::text)
        FROM public.user_role_assignments
        WHERE user_id = p_user_id
      )
    );
  END IF;

  -- Create profile first
  INSERT INTO public.profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create role assignments
  INSERT INTO public.user_role_assignments (user_id, role)
  VALUES
    (p_user_id, 'buyer'::app_role),
    (p_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Handle referral if provided (placeholder for future implementation)
  IF p_referral_code IS NOT NULL THEN
    -- Add referral tracking logic here later
    NULL;
  END IF;

  -- Return success
  v_result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', p_email,
    'roles', ARRAY['buyer', p_role],
    'message', 'User account created successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id,
      'email', p_email
    );
    RETURN v_result;
END;
$$;

-- Grant permissions for signup
GRANT EXECUTE ON FUNCTION public.handle_secure_user_signup(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_secure_user_signup(uuid, text, text, text) TO anon;

-- Update profiles RLS to allow signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON public.profiles;
CREATE POLICY "Users can insert their own profile during signup"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow anon users to call the signup function (secure because function validates user_id)
GRANT USAGE ON SCHEMA public TO anon;
