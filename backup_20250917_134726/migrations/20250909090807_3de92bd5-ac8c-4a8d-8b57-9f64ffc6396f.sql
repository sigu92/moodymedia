-- Fix security warnings by adding proper search_path to functions
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_notification_title TEXT;
  buyer_notification_message TEXT;
  publisher_notification_title TEXT;
  publisher_notification_message TEXT;
  media_domain TEXT;
BEGIN
  -- Get media outlet domain for context
  SELECT domain INTO media_domain
  FROM public.media_outlets
  WHERE id = NEW.media_outlet_id;

  -- Generate notifications based on status change
  CASE NEW.status
    WHEN 'accepted' THEN
      buyer_notification_title := 'Order Accepted';
      buyer_notification_message := 'Your order for ' || media_domain || ' has been accepted by the publisher.';
      
    WHEN 'content_received' THEN
      buyer_notification_title := 'Content Received';
      buyer_notification_message := 'The publisher has received your content for ' || media_domain || '.';
      
    WHEN 'published' THEN
      buyer_notification_title := 'Order Published';
      buyer_notification_message := 'Your content has been published on ' || media_domain || '!';
      
    WHEN 'verified' THEN
      buyer_notification_title := 'Order Verified';
      buyer_notification_message := 'Your order for ' || media_domain || ' has been verified and completed.';
      
    ELSE
      RETURN NEW; -- No notification for other statuses
  END CASE;

  -- Create notification for buyer
  IF buyer_notification_title IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.buyer_id,
      'order_update',
      buyer_notification_title,
      buyer_notification_message,
      jsonb_build_object(
        'order_id', NEW.id,
        'media_outlet_id', NEW.media_outlet_id,
        'status', NEW.status,
        'media_domain', media_domain
      )
    );
    
    -- Log activity
    PERFORM public.log_activity(
      NEW.buyer_id,
      NEW.publisher_id,
      'order_status_changed',
      'order',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'media_domain', media_domain
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_referral_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify when someone signs up with referral code
  IF NEW.status = 'signup_completed' AND (OLD.status IS NULL OR OLD.status != 'signup_completed') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'referral_signup',
      'New Referral Signup',
      'Someone signed up using your referral code! You''ll earn a reward when they make their first purchase.',
      jsonb_build_object(
        'referral_id', NEW.id,
        'reward_amount', NEW.reward_amount
      )
    );
    
    PERFORM public.log_activity(
      NEW.user_id,
      NEW.referred_user_id,
      'referral_signup',
      'referral',
      NEW.id,
      '{}'
    );
  END IF;

  -- Notify when referral makes first order
  IF NEW.status = 'first_order_completed' AND (OLD.status IS NULL OR OLD.status != 'first_order_completed') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'referral_reward',
      'Referral Reward Earned',
      'Congratulations! Your referral made their first purchase. You''ve earned €' || NEW.reward_amount || '!',
      jsonb_build_object(
        'referral_id', NEW.id,
        'reward_amount', NEW.reward_amount,
        'total_spent', NEW.total_spent
      )
    );
    
    PERFORM public.log_activity(
      NEW.user_id,
      NEW.referred_user_id,
      'referral_reward_earned',
      'referral',
      NEW.id,
      jsonb_build_object('reward_amount', NEW.reward_amount)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Enable realtime for notifications and activity
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;