-- Enhance referrals table for better tracking
ALTER TABLE public.referrals 
ADD COLUMN status TEXT DEFAULT 'pending',
ADD COLUMN reward_amount NUMERIC DEFAULT 25.00,
ADD COLUMN reward_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN first_order_date DATE,
ADD COLUMN total_orders INTEGER DEFAULT 0,
ADD COLUMN total_spent NUMERIC DEFAULT 0;

-- Create referral_transactions table for tracking payouts
CREATE TABLE public.referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'reward', 'bonus', 'penalty'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Enable RLS on referral_transactions
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for referral_transactions
CREATE POLICY "Users can view their own referral transactions" 
ON public.referral_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to track referral usage
CREATE OR REPLACE FUNCTION public.track_referral_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user signed up with a referral code
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    -- Find the referrer
    UPDATE public.referrals 
    SET referred_user_id = NEW.id,
        status = 'signup_completed'
    WHERE code = NEW.raw_user_meta_data->>'referral_code'
    AND referred_user_id IS NULL; -- Only if not already used
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for tracking referral signups
CREATE TRIGGER track_referral_signup_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_signup();

-- Create function to handle referral rewards when first order is completed
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  referral_record RECORD;
BEGIN
  -- Only process for new orders that are completed
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Check if this is the user's first completed order
    IF (SELECT COUNT(*) FROM public.orders WHERE buyer_id = NEW.buyer_id AND status = 'published') = 1 THEN
      -- Find referral record for this user
      SELECT * INTO referral_record 
      FROM public.referrals 
      WHERE referred_user_id = NEW.buyer_id 
      AND status = 'signup_completed'
      AND reward_paid = FALSE;
      
      IF FOUND THEN
        -- Update referral status and create reward transaction
        UPDATE public.referrals 
        SET status = 'first_order_completed',
            first_order_date = CURRENT_DATE,
            total_orders = 1,
            total_spent = NEW.price
        WHERE id = referral_record.id;
        
        -- Create reward transaction
        INSERT INTO public.referral_transactions (
          user_id, 
          referral_id, 
          amount, 
          type, 
          description
        ) VALUES (
          referral_record.user_id,
          referral_record.id,
          referral_record.reward_amount,
          'reward',
          'First order completion reward'
        );
      END IF;
    ELSE
      -- Update existing referral stats for subsequent orders
      UPDATE public.referrals 
      SET total_orders = total_orders + 1,
          total_spent = total_spent + NEW.price
      WHERE referred_user_id = NEW.buyer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for processing referral rewards
CREATE TRIGGER process_referral_reward_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_reward();