-- Add new columns to media_outlets table for Phase 1
-- Accepts no license tri-state field
ALTER TABLE public.media_outlets 
ADD COLUMN accepts_no_license_status TEXT CHECK (accepts_no_license_status IN ('yes', 'no', 'depends')) DEFAULT 'no';

-- Sponsor tag functionality
ALTER TABLE public.media_outlets 
ADD COLUMN sponsor_tag_status TEXT CHECK (sponsor_tag_status IN ('yes', 'no')) DEFAULT 'no';

ALTER TABLE public.media_outlets 
ADD COLUMN sponsor_tag_type TEXT CHECK (sponsor_tag_type IN ('image', 'text')) DEFAULT 'text';

-- Update existing accepts_no_license column comment for clarity
COMMENT ON COLUMN public.media_outlets.accepts_no_license IS 'Legacy boolean field - use accepts_no_license_status instead';

-- Create indexes for better query performance
CREATE INDEX idx_media_outlets_accepts_no_license_status ON public.media_outlets(accepts_no_license_status);
CREATE INDEX idx_media_outlets_sponsor_tag_status ON public.media_outlets(sponsor_tag_status);