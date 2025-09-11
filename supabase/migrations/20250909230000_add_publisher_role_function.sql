-- Phase 3: Add Publisher Role Function for Onboarding
-- Create a secure function to add publisher role during onboarding

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS public.add_publisher_role(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.add_publisher_role(
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_existing_role app_role;
  v_row_count integer;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID is required',
      'user_id', p_user_id
    );
  END IF;

  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', p_user_id
    );
  END IF;

  -- Check if user already has publisher role
  SELECT role INTO v_existing_role
  FROM public.user_role_assignments
  WHERE user_id = p_user_id AND role = 'publisher'::app_role;

  -- Log current state for debugging
  RAISE NOTICE 'add_publisher_role: user_id=%, existing_role=%', p_user_id, v_existing_role;

  IF v_existing_role IS NOT NULL THEN
    RAISE NOTICE 'add_publisher_role: User already has publisher role, returning success';
    RETURN json_build_object(
      'success', true,
      'message', 'User already has publisher role',
      'user_id', p_user_id,
      'role_added', 'publisher'
    );
  END IF;

  -- Add publisher role
  RAISE NOTICE 'add_publisher_role: About to insert publisher role for user_id=%', p_user_id;
  INSERT INTO public.user_role_assignments (user_id, role)
  VALUES (p_user_id, 'publisher'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Check if the insert actually happened
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RAISE NOTICE 'add_publisher_role: INSERT affected % rows', v_row_count;

  -- Return success
  v_result := json_build_object(
    'success', true,
    'message', 'Publisher role added successfully',
    'user_id', p_user_id,
    'role_added', 'publisher'
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
GRANT EXECUTE ON FUNCTION public.add_publisher_role(uuid) TO authenticated;

-- Create a more comprehensive function for updating profiles during onboarding
DROP FUNCTION IF EXISTS public.update_onboarding_profile(uuid, text, text, text, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_onboarding_profile(
  p_user_id uuid,
  p_display_name text,
  p_bio text DEFAULT null,
  p_company text DEFAULT null,
  p_country text DEFAULT null,
  p_vat_number text DEFAULT null
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_organization_id uuid;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_display_name IS NULL OR trim(p_display_name) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID and display name are required',
      'user_id', p_user_id
    );
  END IF;

  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', p_user_id
    );
  END IF;

  -- Create organization if company and country are provided
  IF p_company IS NOT NULL AND p_country IS NOT NULL AND trim(p_company) != '' AND trim(p_country) != '' THEN
    INSERT INTO public.organizations (name, country, vat_number)
    VALUES (p_company, p_country, p_vat_number)
    RETURNING id INTO v_organization_id;
    
    -- Update profile with organization
    UPDATE public.profiles
    SET organization_id = v_organization_id
    WHERE user_id = p_user_id;
  END IF;

  -- Return success
  v_result := json_build_object(
    'success', true,
    'message', 'Profile updated successfully',
    'user_id', p_user_id,
    'organization_id', v_organization_id
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
GRANT EXECUTE ON FUNCTION public.update_onboarding_profile(uuid, text, text, text, text, text) TO authenticated;

-- Create function to create media outlets during onboarding
DROP FUNCTION IF EXISTS public.create_onboarding_media_outlet(uuid, text, text, text, numeric, text[], text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_onboarding_media_outlet(
  p_user_id uuid,
  p_domain text,
  p_category text,
  p_price numeric,
  p_niches text[] DEFAULT '{}',
  p_country text DEFAULT 'SE'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_media_outlet_id uuid;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_domain IS NULL OR p_category IS NULL OR p_price IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID, domain, category, and price are required',
      'user_id', p_user_id
    );
  END IF;

  -- Check if user has publisher role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_id = p_user_id AND role = 'publisher'::app_role
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User does not have publisher role',
      'user_id', p_user_id
    );
  END IF;

  -- Check if domain already exists
  IF EXISTS (SELECT 1 FROM public.media_outlets WHERE domain = p_domain) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Domain already exists',
      'user_id', p_user_id,
      'domain', p_domain
    );
  END IF;

  -- Create media outlet
  INSERT INTO public.media_outlets (
    domain, category, price, niches, country, publisher_id
  )
  VALUES (
    p_domain, p_category, p_price, p_niches, p_country, p_user_id
  )
  RETURNING id INTO v_media_outlet_id;

  -- Create default metrics for the media outlet
  INSERT INTO public.metrics (
    media_outlet_id,
    ahrefs_dr, moz_da, semrush_as, spam_score,
    organic_traffic, referring_domains
  )
  VALUES (
    v_media_outlet_id,
    10, 10, 10, 0, 1000, 50
  );

  -- Return success
  v_result := json_build_object(
    'success', true,
    'message', 'Media outlet created successfully',
    'user_id', p_user_id,
    'media_outlet_id', v_media_outlet_id,
    'domain', p_domain
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id,
      'domain', p_domain
    );
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_onboarding_media_outlet(uuid, text, text, numeric, text[], text) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.add_publisher_role(uuid) IS 'Securely adds publisher role to user during onboarding';
COMMENT ON FUNCTION public.update_onboarding_profile(uuid, text, text, text, text, text) IS 'Updates user profile and creates organization during onboarding';
COMMENT ON FUNCTION public.create_onboarding_media_outlet(uuid, text, text, numeric, text[], text) IS 'Creates media outlet and default metrics during onboarding';
