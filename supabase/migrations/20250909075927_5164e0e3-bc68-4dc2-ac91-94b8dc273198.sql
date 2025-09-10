-- Add missing RLS policies for offers table
CREATE POLICY "Users can create their own offers" 
ON public.offers 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own offers" 
ON public.offers 
FOR UPDATE 
USING (auth.uid() = buyer_id);

-- Add a message field to offers table for negotiation context
ALTER TABLE public.offers 
ADD COLUMN message TEXT;

-- Add original_price field to track the original media outlet price
ALTER TABLE public.offers 
ADD COLUMN original_price NUMERIC NOT NULL DEFAULT 0;

-- Update status column properly
ALTER TABLE public.offers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.offers ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE public.offers ALTER COLUMN status SET DEFAULT 'pending';