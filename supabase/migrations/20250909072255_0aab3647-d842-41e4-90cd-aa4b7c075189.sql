-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.set_order_publisher_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Set publisher_id based on the media outlet
    SELECT publisher_id INTO NEW.publisher_id
    FROM public.media_outlets
    WHERE id = NEW.media_outlet_id;
    
    RETURN NEW;
END;
$$;