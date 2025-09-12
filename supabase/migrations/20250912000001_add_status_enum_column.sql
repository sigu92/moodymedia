-- Add status column with enum to media_outlets table for marketplace approval workflow
-- Status flow: pending -> approved/rejected -> active (for approved only)

-- Create the enum type first
CREATE TYPE media_outlet_status AS ENUM ('pending', 'approved', 'rejected', 'active');

-- Add the status column with default 'active' for existing records
ALTER TABLE public.media_outlets
ADD COLUMN IF NOT EXISTS status media_outlet_status NOT NULL DEFAULT 'active';
