-- Phase 3: Email Confirmation Setup and Final Cleanup

-- Create function to handle post-signup user setup
CREATE OR REPLACE FUNCTION public.finalize_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function runs after a user confirms their email
  -- It can be used for additional setup like welcome emails, etc.

  -- Log the email confirmation
  INSERT INTO public.activity_feed (
    user_id,
    action,
    entity_type,
    metadata
  ) VALUES (
    NEW.id,
    'email_confirmed',
    'user',
    json_build_object('confirmed_at', NEW.email_confirmed_at)
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error in finalize_user_setup: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for email confirmation (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_user_email_confirmed'
  ) THEN
    CREATE TRIGGER trigger_user_email_confirmed
      AFTER UPDATE OF email_confirmed_at ON auth.users
      FOR EACH ROW
      WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
      EXECUTE FUNCTION public.finalize_user_setup();
  END IF;
END;
$$;

-- Create activity_feed table if it doesn't exist (for tracking user actions)
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on activity_feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_feed (with error handling)
DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_feed;

CREATE POLICY "Users can view their own activity"
ON public.activity_feed FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
ON public.activity_feed FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.activity_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_feed_action ON public.activity_feed(action);

-- Create function to get user activity summary
CREATE OR REPLACE FUNCTION public.get_user_activity_summary(user_uuid uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_actions', COUNT(*),
    'recent_actions', COUNT(*) FILTER (WHERE created_at > now() - interval '7 days'),
    'last_activity', MAX(created_at)
  )
  FROM public.activity_feed
  WHERE user_id = COALESCE(user_uuid, auth.uid());
$$;

-- Grant permissions
GRANT SELECT ON public.activity_feed TO authenticated;
GRANT INSERT ON public.activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activity_summary(uuid) TO authenticated;
