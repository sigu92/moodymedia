-- Phase 1: RBAC Foundation for System Admin Console

-- Add system_admin to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'system_admin';

-- Create helper function for platform admin check (admin OR system_admin)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role)
$$;

-- Create audit_log table for tracking admin actions
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  before_data JSONB DEFAULT '{}',
  after_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view audit logs
CREATE POLICY "Platform admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (is_platform_admin());

-- Only platform admins can insert audit logs (via functions)
CREATE POLICY "Platform admins can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (is_platform_admin());

-- Create imports table for tracking batch imports
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('csv', 'xlsx', 'google_sheet')),
  source_url TEXT,
  created_by UUID NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  log_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on imports
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage imports
CREATE POLICY "Platform admins can manage imports"
ON public.imports
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Create payout_requests table for referral payouts
CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'paid', 'denied')),
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payout_requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own payout requests
CREATE POLICY "Users can view own payout requests"
ON public.payout_requests
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Users can create their own payout requests
CREATE POLICY "Users can create own payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (auth.uid() = referrer_user_id);

-- Platform admins can manage all payout requests
CREATE POLICY "Platform admins can manage payout requests"
ON public.payout_requests
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Add admin_tags and source columns to media_outlets for categorization
ALTER TABLE public.media_outlets 
ADD COLUMN IF NOT EXISTS admin_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'db';

-- Create updated_at trigger for payout_requests
CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_imports_created_by ON public.imports(created_by);
CREATE INDEX IF NOT EXISTS idx_imports_batch_id ON public.imports(batch_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_referrer ON public.payout_requests(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_media_outlets_domain ON public.media_outlets(domain);

-- Update existing RLS policies to use is_platform_admin() where appropriate

-- Update media_outlets admin policy
DROP POLICY IF EXISTS "Admins can manage all media outlets" ON public.media_outlets;
CREATE POLICY "Platform admins can manage all media outlets"
ON public.media_outlets
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update metrics admin policy  
DROP POLICY IF EXISTS "Admins can manage all metrics" ON public.metrics;
CREATE POLICY "Platform admins can manage all metrics"
ON public.metrics
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update orders admin policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Platform admins can manage all orders"
ON public.orders
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update listings admin policy
DROP POLICY IF EXISTS "Admins can manage all listings" ON public.listings;
CREATE POLICY "Platform admins can manage all listings"
ON public.listings
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update activity_feed admin policy
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_feed;
CREATE POLICY "Platform admins can view all activity"
ON public.activity_feed
FOR SELECT
USING (is_platform_admin());

-- Update user_roles admin policy
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
CREATE POLICY "Platform admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update profiles admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_platform_admin());

-- Update organizations admin policy
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
CREATE POLICY "Platform admins can manage organizations"
ON public.organizations
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());