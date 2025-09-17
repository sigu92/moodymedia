-- Phase 5: RBAC Foundation - System Admin and Enhanced Admin Features (Skip enum update)

-- 1. Create audit_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.audit_log (
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
DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.audit_log;
CREATE POLICY "Platform admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can insert audit logs" ON public.audit_log;
CREATE POLICY "Platform admins can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (is_platform_admin());

-- 2. Create imports table for tracking batch imports
CREATE TABLE IF NOT EXISTS public.imports (
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
DROP POLICY IF EXISTS "Platform admins can manage imports" ON public.imports;
CREATE POLICY "Platform admins can manage imports"
ON public.imports
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- 3. Create payout_requests table for referral payouts
CREATE TABLE IF NOT EXISTS public.payout_requests (
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
DROP POLICY IF EXISTS "Users can create own payout requests" ON public.payout_requests;
CREATE POLICY "Users can create own payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Users can view own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view own payout requests"
ON public.payout_requests
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Platform admins can manage all payout requests
DROP POLICY IF EXISTS "Platform admins can manage payout requests" ON public.payout_requests;
CREATE POLICY "Platform admins can manage payout requests"
ON public.payout_requests
FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- 4. Add admin_tags and source columns to media_outlets if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_outlets' AND column_name = 'admin_tags') THEN
    ALTER TABLE public.media_outlets ADD COLUMN admin_tags TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_outlets' AND column_name = 'source') THEN
    ALTER TABLE public.media_outlets ADD COLUMN source TEXT DEFAULT 'db';
  END IF;
END$$;

-- 5. Create indexes for performance (skip if already exist)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_media_outlets_domain ON public.media_outlets(domain);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status_requested_at ON public.payout_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_user_status ON public.referral_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_imports_created_at ON public.imports(created_at);

-- 6. Create trigger for payout_requests updated_at
DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON public.payout_requests;
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();