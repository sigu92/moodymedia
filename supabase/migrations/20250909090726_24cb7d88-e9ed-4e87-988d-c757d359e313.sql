-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  order_updates BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  referral_updates BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for activity_feed
CREATE POLICY "Users can view their own activity" 
ON public.activity_feed 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" 
ON public.activity_feed 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for notification_settings
CREATE POLICY "Users can manage their notification settings" 
ON public.notification_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (target_user_id, notification_type, notification_title, notification_message, notification_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  target_user_id UUID,
  actor_user_id UUID,
  activity_action TEXT,
  activity_entity_type TEXT,
  activity_entity_id UUID DEFAULT NULL,
  activity_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (user_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (target_user_id, actor_user_id, activity_action, activity_entity_type, activity_entity_id, activity_metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Create trigger function for order status notifications
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for order status changes
CREATE TRIGGER order_status_notification_trigger
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_order_status_change();

-- Create trigger function for referral notifications
CREATE OR REPLACE FUNCTION public.notify_referral_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for referral updates
CREATE TRIGGER referral_notification_trigger
AFTER UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.notify_referral_updates();