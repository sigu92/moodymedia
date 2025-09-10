-- Add missing columns to orders table for complete order management
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Update orders table to set publisher_id based on media outlet
UPDATE public.orders 
SET publisher_id = media_outlets.publisher_id
FROM public.media_outlets 
WHERE public.orders.media_outlet_id = media_outlets.id 
AND public.orders.publisher_id IS NULL;

-- Create trigger to automatically set publisher_id when creating orders
CREATE OR REPLACE FUNCTION public.set_order_publisher_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set publisher_id based on the media outlet
    SELECT publisher_id INTO NEW.publisher_id
    FROM public.media_outlets
    WHERE id = NEW.media_outlet_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_publisher_id_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_publisher_id();

-- Create trigger for order status changes
CREATE TRIGGER track_order_status_changes_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.track_order_status_changes();

-- Insert some sample orders for testing
INSERT INTO public.orders (buyer_id, media_outlet_id, price, currency, status, briefing, anchor, target_url) 
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid as buyer_id,
    mo.id as media_outlet_id,
    mo.price,
    mo.currency,
    'requested'::order_status as status,
    'Please write an article about sustainable fashion trends in 2024. Include information about eco-friendly materials and ethical manufacturing practices.' as briefing,
    'sustainable fashion trends 2024' as anchor,
    'https://example.com/target-page' as target_url
FROM public.media_outlets mo
WHERE mo.domain IN ('badlands.nu', 'dittandralag.se')
ON CONFLICT DO NOTHING;