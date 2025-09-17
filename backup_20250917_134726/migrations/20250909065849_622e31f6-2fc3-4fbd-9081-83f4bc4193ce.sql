-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'publisher', 'buyer');

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('requested', 'accepted', 'content_received', 'published', 'verified');

-- Create organizations table
CREATE TABLE public.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    vat_number TEXT,
    country TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    UNIQUE(user_id, role),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media_outlets table
CREATE TABLE public.media_outlets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    language TEXT NOT NULL,
    country TEXT NOT NULL,
    niches TEXT[] NOT NULL DEFAULT '{}',
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    guidelines TEXT,
    lead_time_days INTEGER NOT NULL DEFAULT 7,
    publisher_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metrics table
CREATE TABLE public.metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id) ON DELETE CASCADE,
    ahrefs_dr INTEGER NOT NULL DEFAULT 0,
    moz_da INTEGER NOT NULL DEFAULT 0,
    semrush_as INTEGER NOT NULL DEFAULT 0,
    spam_score INTEGER NOT NULL DEFAULT 0,
    organic_traffic INTEGER NOT NULL DEFAULT 0,
    referring_domains INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create listings table
CREATE TABLE public.listings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create favorites table
CREATE TABLE public.favorites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, media_outlet_id)
);

-- Create saved_filters table
CREATE TABLE public.saved_filters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    query JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cart_items table
CREATE TABLE public.cart_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, media_outlet_id)
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id),
    publisher_id UUID NOT NULL REFERENCES auth.users(id),
    media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id),
    status public.order_status NOT NULL DEFAULT 'requested',
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    briefing TEXT,
    anchor TEXT,
    target_url TEXT,
    publication_url TEXT,
    publication_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_status_history table
CREATE TABLE public.order_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status public.order_status,
    to_status public.order_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stub tables
CREATE TABLE public.offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id),
    publisher_id UUID NOT NULL REFERENCES auth.users(id),
    media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id),
    suggested_price NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.wallet_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.referrals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    code TEXT NOT NULL UNIQUE,
    referred_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_media_outlets_updated_at
    BEFORE UPDATE ON public.media_outlets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for order status history
CREATE OR REPLACE FUNCTION public.track_order_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER track_order_status_changes
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.track_order_status_changes();

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Organizations policies
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.organization_id = organizations.id
        )
    );

CREATE POLICY "Admins can manage organizations" ON public.organizations
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Media outlets policies (public read when active)
CREATE POLICY "Everyone can view active media outlets" ON public.media_outlets
    FOR SELECT USING (is_active = true);

CREATE POLICY "Publishers can manage their own media outlets" ON public.media_outlets
    FOR ALL USING (auth.uid() = publisher_id);

CREATE POLICY "Admins can manage all media outlets" ON public.media_outlets
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Metrics policies
CREATE POLICY "Everyone can view metrics for active media outlets" ON public.metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.media_outlets
            WHERE media_outlets.id = metrics.media_outlet_id
            AND media_outlets.is_active = true
        )
    );

CREATE POLICY "Publishers can manage metrics for their media outlets" ON public.metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.media_outlets
            WHERE media_outlets.id = metrics.media_outlet_id
            AND media_outlets.publisher_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all metrics" ON public.metrics
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Listings policies
CREATE POLICY "Everyone can view active listings" ON public.listings
    FOR SELECT USING (is_active = true);

CREATE POLICY "Publishers can manage their listings" ON public.listings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.media_outlets
            WHERE media_outlets.id = listings.media_outlet_id
            AND media_outlets.publisher_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all listings" ON public.listings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Favorites policies
CREATE POLICY "Users can manage their own favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- Saved filters policies
CREATE POLICY "Users can manage their own saved filters" ON public.saved_filters
    FOR ALL USING (auth.uid() = user_id);

-- Cart items policies
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Buyers can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Publishers can view orders for their media outlets" ON public.orders
    FOR SELECT USING (auth.uid() = publisher_id);

CREATE POLICY "Buyers can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their orders" ON public.orders
    FOR UPDATE USING (auth.uid() = buyer_id);

CREATE POLICY "Publishers can update orders for their media" ON public.orders
    FOR UPDATE USING (auth.uid() = publisher_id);

CREATE POLICY "Admins can manage all orders" ON public.orders
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Order status history policies
CREATE POLICY "Users can view order history for their orders" ON public.order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_history.order_id
            AND (orders.buyer_id = auth.uid() OR orders.publisher_id = auth.uid())
        )
    );

CREATE POLICY "Admins can view all order history" ON public.order_status_history
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Stub table policies
CREATE POLICY "Users can view their offers" ON public.offers
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = publisher_id);

CREATE POLICY "Users can manage their wallet transactions" ON public.wallet_transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their referrals" ON public.referrals
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_media_outlets_country ON public.media_outlets(country);
CREATE INDEX idx_media_outlets_language ON public.media_outlets(language);
CREATE INDEX idx_media_outlets_category ON public.media_outlets(category);
CREATE INDEX idx_media_outlets_price ON public.media_outlets(price);
CREATE INDEX idx_media_outlets_publisher_id ON public.media_outlets(publisher_id);
CREATE INDEX idx_metrics_media_outlet_id ON public.metrics(media_outlet_id);
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_publisher_id ON public.orders(publisher_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);