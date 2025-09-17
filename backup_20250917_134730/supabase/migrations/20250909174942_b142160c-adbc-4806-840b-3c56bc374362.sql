-- Phase 5: RBAC Foundation - System Admin and Enhanced Admin Features

-- 1. Add 'system_admin' to app_role enum
ALTER TYPE public.app_role ADD VALUE 'system_admin';

-- 2. Update is_platform_admin function to include system_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role)
$$;

-- 3. Create audit_log table for tracking admin actions
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  before_data JSONB DEFAULT '{}'::jsonb,
  after_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view and insert audit logs
CREATE POLICY "Platform admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (is_platform_admin());

CREATE POLICY "Platform admins can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (is_platform_admin());

-- 4. Create imports table for tracking batch imports
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'csv', 'xlsx', 'google_sheet'
  source_url TEXT,
  created_by UUID NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  log_data JSONB DEFAULT '{}'::jsonb,
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

-- 5. Create payout_requests table for referral payouts
CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested', -- 'requested', 'approved', 'paid', 'denied'
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payout_requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own payout requests and view them
CREATE POLICY "Users can create own payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (auth.uid() = referrer_user_id);

CREATE POLICY "Users can view own payout requests"
ON public.payout_requests
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Platform admins can manage all payout requests
CREATE POLICY "Platform admins can manage payout requests"
ON public.payout_requests
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- 6. Add admin_tags and source columns to media_outlets
ALTER TABLE public.media_outlets 
ADD COLUMN admin_tags TEXT[] DEFAULT '{}',
ADD COLUMN source TEXT DEFAULT 'db';

-- 7. Create indexes for performance
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_media_outlets_domain ON public.media_outlets(domain);
CREATE INDEX idx_payout_requests_status_requested_at ON public.payout_requests(status, requested_at);
CREATE INDEX idx_referral_transactions_user_status ON public.referral_transactions(user_id, status);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX idx_imports_created_at ON public.imports(created_at);

-- 8. Create trigger for payout_requests updated_at
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();