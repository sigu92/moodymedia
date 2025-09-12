-- Add purchase_price column to media_outlets table for marketplace manager system
-- This column stores what we pay publishers for their websites

ALTER TABLE public.media_outlets
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
