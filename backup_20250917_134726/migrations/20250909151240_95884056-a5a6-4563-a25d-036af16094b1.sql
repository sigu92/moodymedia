-- Create niches reference table
CREATE TABLE public.niches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create global default multipliers for niches
CREATE TABLE public.niche_multipliers_global (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  niche_id UUID NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  default_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(niche_id)
);

-- Create outlet-specific niche rules
CREATE TABLE public.outlet_niche_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id) ON DELETE CASCADE,
  niche_id UUID NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL DEFAULT false,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(media_outlet_id, niche_id)
);

-- Add new columns to media_outlets
ALTER TABLE public.media_outlets 
ADD COLUMN accepts_no_license BOOLEAN DEFAULT false,
ADD COLUMN sponsor_tag TEXT CHECK (sponsor_tag IN ('text', 'image', 'unknown')) DEFAULT 'unknown',
ADD COLUMN sale_price NUMERIC,
ADD COLUMN sale_note TEXT;

-- Add new columns to orders for niche pricing
ALTER TABLE public.orders
ADD COLUMN niche_id UUID REFERENCES public.niches(id),
ADD COLUMN base_price NUMERIC,
ADD COLUMN price_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN final_price NUMERIC;

-- Add new columns to cart_items for niche pricing  
ALTER TABLE public.cart_items
ADD COLUMN niche_id UUID REFERENCES public.niches(id),
ADD COLUMN base_price NUMERIC,
ADD COLUMN price_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN final_price NUMERIC;

-- Enable RLS on new tables
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_multipliers_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlet_niche_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for niches (public read)
CREATE POLICY "Anyone can view niches" 
ON public.niches 
FOR SELECT 
USING (true);

-- RLS policies for global multipliers (public read)
CREATE POLICY "Anyone can view global multipliers" 
ON public.niche_multipliers_global 
FOR SELECT 
USING (true);

-- RLS policies for outlet niche rules
CREATE POLICY "Anyone can view niche rules for active outlets" 
ON public.outlet_niche_rules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.media_outlets 
    WHERE id = outlet_niche_rules.media_outlet_id 
    AND is_active = true
  )
);

CREATE POLICY "Publishers can manage their outlet niche rules" 
ON public.outlet_niche_rules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.media_outlets 
    WHERE id = outlet_niche_rules.media_outlet_id 
    AND publisher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all niche rules" 
ON public.outlet_niche_rules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for outlet_niche_rules updated_at
CREATE TRIGGER update_outlet_niche_rules_updated_at
BEFORE UPDATE ON public.outlet_niche_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default niches
INSERT INTO public.niches (slug, label) VALUES
('casino', 'Casino'),
('loans', 'Loans'), 
('adult', 'Adult'),
('dating', 'Dating'),
('cbd', 'CBD'),
('crypto', 'Crypto'),
('forex', 'Forex');

-- Insert default global multipliers
INSERT INTO public.niche_multipliers_global (niche_id, default_multiplier)
SELECT id, 
  CASE slug
    WHEN 'casino' THEN 2.0
    WHEN 'loans' THEN 1.8
    WHEN 'adult' THEN 1.5
    WHEN 'dating' THEN 1.5
    WHEN 'cbd' THEN 1.5
    WHEN 'crypto' THEN 1.5
    WHEN 'forex' THEN 1.8
    ELSE 1.0
  END
FROM public.niches;