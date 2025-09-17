-- Create org_settings table
CREATE TABLE public.org_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  company_name TEXT NOT NULL CHECK (length(company_name) >= 2 AND length(company_name) <= 150),
  primary_email TEXT NOT NULL CHECK (primary_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  notification_email TEXT NOT NULL CHECK (notification_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  orders_email TEXT NOT NULL CHECK (orders_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own org settings" 
ON public.org_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own org settings" 
ON public.org_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own org settings" 
ON public.org_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own org settings" 
ON public.org_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_org_settings_updated_at
BEFORE UPDATE ON public.org_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();