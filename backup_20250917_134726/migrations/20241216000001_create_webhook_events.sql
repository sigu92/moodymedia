-- Create webhook events table for idempotency handling
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'duplicate', 'unhandled')),
  event_data JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);

-- Add partial index for cleanup
CREATE INDEX IF NOT EXISTS idx_webhook_events_old_processed ON webhook_events(processed_at)
  WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '30 days';

-- Add RLS policies
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage webhook events
CREATE POLICY "Service role can manage webhook events" ON webhook_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to check if event was already processed
CREATE OR REPLACE FUNCTION is_event_processed(p_event_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM webhook_events
    WHERE stripe_event_id = p_event_id
    AND status = 'processed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record processed event
CREATE OR REPLACE FUNCTION record_processed_event(
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_event_data JSONB,
  p_status TEXT DEFAULT 'processed',
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO webhook_events (
    event_id,
    event_type,
    stripe_event_id,
    event_data,
    status,
    error_message
  ) VALUES (
    gen_random_uuid()::TEXT,
    p_event_type,
    p_stripe_event_id,
    p_event_data,
    p_status,
    p_error_message
  )
  ON CONFLICT (stripe_event_id) DO UPDATE SET
    status = EXCLUDED.status,
    error_message = EXCLUDED.error_message,
    updated_at = NOW(),
    retry_count = webhook_events.retry_count + 1
  WHERE webhook_events.status != 'processed'; -- Only update if not already processed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old webhook events (keep last 90 days of processed events)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE status = 'processed'
  AND processed_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get webhook processing statistics
CREATE OR REPLACE FUNCTION get_webhook_stats()
RETURNS TABLE (
  total_events BIGINT,
  processed_events BIGINT,
  failed_events BIGINT,
  duplicate_events BIGINT,
  events_last_24h BIGINT,
  events_last_7d BIGINT,
  events_last_30d BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM webhook_events) as total_events,
    (SELECT COUNT(*) FROM webhook_events WHERE status = 'processed') as processed_events,
    (SELECT COUNT(*) FROM webhook_events WHERE status = 'failed') as failed_events,
    (SELECT COUNT(*) FROM webhook_events WHERE status = 'duplicate') as duplicate_events,
    (SELECT COUNT(*) FROM webhook_events WHERE created_at >= NOW() - INTERVAL '24 hours') as events_last_24h,
    (SELECT COUNT(*) FROM webhook_events WHERE created_at >= NOW() - INTERVAL '7 days') as events_last_7d,
    (SELECT COUNT(*) FROM webhook_events WHERE created_at >= NOW() - INTERVAL '30 days') as events_last_30d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
