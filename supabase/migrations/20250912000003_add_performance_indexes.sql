-- Add performance indexes for marketplace manager system
-- Indexes on frequently queried columns for admin dashboard performance

CREATE INDEX IF NOT EXISTS idx_media_outlets_status ON public.media_outlets(status);
CREATE INDEX IF NOT EXISTS idx_media_outlets_submitted_at ON public.media_outlets(submitted_at);
CREATE INDEX IF NOT EXISTS idx_media_outlets_reviewed_at ON public.media_outlets(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_media_outlets_submitted_by ON public.media_outlets(submitted_by);
CREATE INDEX IF NOT EXISTS idx_media_outlets_reviewed_by ON public.media_outlets(reviewed_by);
