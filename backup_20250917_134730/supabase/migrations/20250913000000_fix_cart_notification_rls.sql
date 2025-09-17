-- Fix RLS policies for cart and notifications to resolve 403/406 errors

-- Add INSERT policy for notifications table
CREATE POLICY "Users can insert notifications for themselves"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add INSERT policy for admins to create notifications for other users (for system notifications)
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role));

-- Ensure notification_settings has proper policies
DROP POLICY IF EXISTS "Users can manage their notification settings" ON public.notification_settings;
CREATE POLICY "Users can manage their notification settings"
ON public.notification_settings
FOR ALL
USING (auth.uid() = user_id);

-- Add admin access to notification_settings for debugging
CREATE POLICY "Admins can view notification settings"
ON public.notification_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role));

-- Verify cart_items RLS is working correctly
-- (This policy should already exist from initial migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'cart_items'
        AND policyname = 'Users can manage their own cart items'
    ) THEN
        CREATE POLICY "Users can manage their own cart items" ON public.cart_items
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add policy for service role to create notifications (for edge functions)
CREATE POLICY "Service role can manage all notifications"
ON public.notifications
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add policy for service role to manage notification_settings
CREATE POLICY "Service role can manage notification settings"
ON public.notification_settings
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');
