-- Add status column with enum to media_outlets table for marketplace approval workflow
-- Status flow: pending -> approved/rejected -> active (for approved only)

-- Create the enum type first
CREATE TYPE media_outlet_status AS ENUM ('pending', 'approved', 'rejected', 'active');

-- Add the status column without default value - status must be explicitly set
ALTER TABLE public.media_outlets
ADD COLUMN IF NOT EXISTS status media_outlet_status NOT NULL;

-- Set existing records to 'active' (they were previously active)
UPDATE public.media_outlets SET status = 'active' WHERE status IS NULL;

-- Ensure no default value is set on the status column
ALTER TABLE public.media_outlets ALTER COLUMN status DROP DEFAULT;

-- Add a check constraint to ensure status is always explicitly set
ALTER TABLE public.media_outlets ADD CONSTRAINT status_required CHECK (status IS NOT NULL);
