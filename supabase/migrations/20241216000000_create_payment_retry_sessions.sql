-- Create payment retry sessions table for persistent retry management
CREATE TABLE IF NOT EXISTS payment_retry_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  current_attempt INTEGER NOT NULL DEFAULT 0,
  retry_delay INTEGER NOT NULL DEFAULT 1000,
  backoff_multiplier DECIMAL(3,2) NOT NULL DEFAULT 2.0,
  max_delay INTEGER NOT NULL DEFAULT 30000,
  retryable_errors TEXT[] DEFAULT ARRAY['network_error', 'timeout', 'rate_limit', 'temporary_failure', 'service_unavailable'],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'cancelled')),
  error_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_retry_sessions_status ON payment_retry_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_retry_sessions_created_at ON payment_retry_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_retry_sessions_next_retry ON payment_retry_sessions(next_retry_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payment_retry_sessions_user_id ON payment_retry_sessions(user_id);

-- Add RLS policies
ALTER TABLE payment_retry_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to manage their own retry sessions
CREATE POLICY "Users can manage their retry sessions" ON payment_retry_sessions
  FOR ALL USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Policy: Allow service role to manage all retry sessions (for cleanup)
CREATE POLICY "Service role can manage all retry sessions" ON payment_retry_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to automatically clean up old retry sessions
CREATE OR REPLACE FUNCTION cleanup_expired_retry_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM payment_retry_sessions
  WHERE created_at < NOW() - INTERVAL '24 hours'
  AND status IN ('cancelled', 'exhausted');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get active retry sessions for monitoring
CREATE OR REPLACE FUNCTION get_active_retry_sessions()
RETURNS TABLE (
  session_id TEXT,
  current_attempt INTEGER,
  max_attempts INTEGER,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    prs.session_id,
    prs.current_attempt,
    prs.max_attempts,
    prs.next_retry_at,
    prs.created_at
  FROM payment_retry_sessions prs
  WHERE prs.status = 'active'
  ORDER BY prs.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
