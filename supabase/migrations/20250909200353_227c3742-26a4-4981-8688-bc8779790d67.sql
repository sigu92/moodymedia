-- Add invoice-related fields to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS state_province TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS business_registration_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS organizational_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_person_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_person_email TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS bank_routing_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS swift_bic TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '30 days';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'EUR';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS invoice_notes TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_organizations_updated_at_trigger ON public.organizations;
CREATE TRIGGER update_organizations_updated_at_trigger
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_organizations_updated_at();