-- Task 10.0: Database & Backend Preparation for Enhanced Checkout System
-- This migration enhances the orders system to support the new comprehensive checkout flow

-- 1. Add new order status values to support the checkout workflow
DO $$ BEGIN
  -- Add new order status values if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status') AND enumlabel = 'action_needed') THEN
    ALTER TYPE public.order_status ADD VALUE 'action_needed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status') AND enumlabel = 'processing') THEN
    ALTER TYPE public.order_status ADD VALUE 'processing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status') AND enumlabel = 'completed') THEN
    ALTER TYPE public.order_status ADD VALUE 'completed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status') AND enumlabel = 'cancelled') THEN
    ALTER TYPE public.order_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- 2. Enhance orders table with checkout-specific fields
ALTER TABLE public.orders
ADD COLUMN order_number TEXT UNIQUE,
ADD COLUMN subtotal NUMERIC DEFAULT 0,
ADD COLUMN vat_amount NUMERIC DEFAULT 0,
ADD COLUMN total_amount NUMERIC DEFAULT 0,
ADD COLUMN currency TEXT DEFAULT 'EUR',

-- Billing Information
ADD COLUMN billing_first_name TEXT,
ADD COLUMN billing_last_name TEXT,
ADD COLUMN billing_company TEXT,
ADD COLUMN billing_email TEXT,
ADD COLUMN billing_phone TEXT,
ADD COLUMN billing_address_street TEXT,
ADD COLUMN billing_address_city TEXT,
ADD COLUMN billing_address_postal TEXT,
ADD COLUMN billing_address_country TEXT,
ADD COLUMN billing_tax_id TEXT,

-- Payment Information
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('stripe', 'paypal', 'invoice')),
ADD COLUMN payment_po_number TEXT,
ADD COLUMN payment_id TEXT,

-- Content Preferences
ADD COLUMN content_option TEXT CHECK (content_option IN ('self-provided', 'professional')),

-- Metadata
ADD COLUMN notes TEXT,
ADD COLUMN stripe_session_id TEXT;

-- 3. Create order_items table for cart items within orders
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cart_item_id UUID,
  media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  niche TEXT,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  content_option TEXT CHECK (content_option IN ('self-provided', 'professional')),
  niche_id UUID,
  base_price NUMERIC,
  price_multiplier NUMERIC DEFAULT 1.0,
  final_price NUMERIC,
  uploaded_files TEXT[],
  google_docs_links TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create order_content table for file uploads and content tracking
CREATE TABLE public.order_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT,
  content_type TEXT CHECK (content_type IN ('word_doc', 'google_doc', 'image', 'other')),
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploaded', 'processing', 'completed', 'failed')),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- 5. Create notifications table for admin alerts and user notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order_confirmation', 'admin_alert', 'content_review', 'payment_success', 'order_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Enable RLS on new tables
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create indexes for performance
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_media_outlet_id ON public.order_items(media_outlet_id);
CREATE INDEX idx_order_content_order_id ON public.order_content(order_id);
CREATE INDEX idx_order_content_order_item_id ON public.order_content(order_item_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_payment_method ON public.orders(payment_method);

-- 8. Create updated_at triggers for new tables
CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_content_updated_at
  BEFORE UPDATE ON public.order_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Create function to generate unique order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
  order_number TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate timestamp part (last 6 digits of current timestamp)
  timestamp_part := RIGHT(EXTRACT(epoch FROM now())::TEXT, 6);

  -- Generate random 3-digit number
  random_part := LPAD((random() * 999)::INTEGER::TEXT, 3, '0');

  -- Create order number
  order_number := 'MO-' || timestamp_part || '-' || random_part;

  -- Ensure uniqueness (retry up to 10 times)
  WHILE counter < 10 AND EXISTS(SELECT 1 FROM orders WHERE orders.order_number = order_number) LOOP
    random_part := LPAD((random() * 999)::INTEGER::TEXT, 3, '0');
    order_number := 'MO-' || timestamp_part || '-' || random_part;
    counter := counter + 1;
  END LOOP;

  RETURN order_number;
END;
$$;

-- 10. Create function to notify admins of content uploads
CREATE OR REPLACE FUNCTION public.notify_admin_content_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify for new content uploads
  IF TG_OP = 'INSERT' AND NEW.upload_status = 'uploaded' THEN
    -- Insert notifications for all admin users
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT
      ur.user_id,
      'admin_alert',
      'Content Upload Notification',
      'New content has been uploaded for order ' || o.order_number,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'contentId', NEW.id,
        'fileName', NEW.file_name
      )
    FROM public.user_roles ur
    JOIN public.orders o ON o.id = NEW.order_id
    WHERE ur.role IN ('admin', 'system_admin');
  END IF;

  RETURN NEW;
END;
$$;

-- 11. Create trigger for admin notifications on content upload
CREATE TRIGGER notify_admin_content_upload_trigger
  AFTER INSERT OR UPDATE ON public.order_content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_content_upload();

-- 12. Create function to handle order status changes and notifications
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert status change into history
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(auth.uid(), NEW.user_id));

    -- Create notifications based on status change
    CASE NEW.status
      WHEN 'action_needed' THEN
        -- Notify buyer that order is ready for action
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'order_update',
          'Action Required',
          'Your order ' || COALESCE(NEW.order_number, NEW.id::TEXT) || ' requires attention',
          jsonb_build_object('orderId', NEW.id, 'orderNumber', NEW.order_number, 'status', NEW.status)
        );

      WHEN 'processing' THEN
        -- Notify buyer that order is being processed
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'order_update',
          'Order Processing Started',
          'Your order ' || COALESCE(NEW.order_number, NEW.id::TEXT) || ' is now being processed',
          jsonb_build_object('orderId', NEW.id, 'orderNumber', NEW.order_number, 'status', NEW.status)
        );

      WHEN 'completed' THEN
        -- Notify buyer that order is completed
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'order_update',
          'Order Completed',
          'Your order ' || COALESCE(NEW.order_number, NEW.id::TEXT) || ' has been completed successfully',
          jsonb_build_object('orderId', NEW.id, 'orderNumber', NEW.order_number, 'status', NEW.status)
        );

      ELSE
        -- Generic status change notification
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'order_update',
          'Order Status Updated',
          'Your order ' || COALESCE(NEW.order_number, NEW.id::TEXT) || ' status changed to ' || NEW.status,
          jsonb_build_object('orderId', NEW.id, 'orderNumber', NEW.order_number, 'status', NEW.status)
        );
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

-- 13. Update the existing order status change trigger to use the new function
DROP TRIGGER IF EXISTS track_order_status_changes ON public.orders;
CREATE TRIGGER track_order_status_changes
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();

-- 14. RLS Policies for new tables

-- Order items policies
CREATE POLICY "Users can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for their orders" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'system_admin'));

-- Order content policies
CREATE POLICY "Users can view content for their orders" ON public.order_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_content.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload content for their orders" ON public.order_content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_content.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own uploads" ON public.order_content
  FOR UPDATE USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all order content" ON public.order_content
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'system_admin'));

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications for users" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'system_admin'));

-- 15. Create function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now(), updated_at = now()
  WHERE id = notification_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- 16. Create function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notifications
  WHERE user_id = auth.uid() AND read = false;
$$;

-- 17. Add comments for documentation
COMMENT ON TABLE public.order_items IS 'Individual items within an order, supporting multiple cart items per order';
COMMENT ON TABLE public.order_content IS 'File uploads and content associated with orders';
COMMENT ON TABLE public.notifications IS 'User notifications for order updates, admin alerts, and system messages';
COMMENT ON COLUMN public.orders.order_number IS 'Unique order number in format MO-XXXXXX-XXX';
COMMENT ON COLUMN public.orders.content_option IS 'Whether order uses self-provided or professional content writing';
COMMENT ON COLUMN public.order_items.content_option IS 'Content option for this specific item';
COMMENT ON COLUMN public.order_content.content_type IS 'Type of content uploaded (word_doc, google_doc, image, other)';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification (order_confirmation, admin_alert, etc.)';

-- 18. Update existing orders table RLS to include new fields
-- The existing policies should work with the new fields, but we may need to update them
-- if we add more complex access patterns in the future
