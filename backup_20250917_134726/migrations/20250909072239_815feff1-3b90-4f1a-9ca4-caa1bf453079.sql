-- Add missing columns to orders table for complete order management
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

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

DROP TRIGGER IF EXISTS set_order_publisher_id_trigger ON public.orders;
CREATE TRIGGER set_order_publisher_id_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_publisher_id();

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS track_order_status_changes_trigger ON public.orders;
CREATE TRIGGER track_order_status_changes_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.track_order_status_changes();