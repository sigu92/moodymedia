-- Add submission tracking columns to media_outlets table for marketplace approval workflow
-- These columns track who submitted/reviewed each website and when

ALTER TABLE public.media_outlets
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_notes TEXT;
