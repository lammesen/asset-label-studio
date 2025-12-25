-- 0006_rate_limits.sql
-- Shared storage for rate limiting (replaces in-memory Map)

CREATE TABLE IF NOT EXISTS rate_limits (
  key text NOT NULL,
  bucket bigint NOT NULL,
  count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, bucket)
);

CREATE INDEX IF NOT EXISTS rate_limits_bucket_idx ON rate_limits(bucket);
CREATE INDEX IF NOT EXISTS rate_limits_updated_idx ON rate_limits(updated_at);

-- Cleanup function to remove old buckets (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits(older_than_seconds integer DEFAULT 3600)
RETURNS integer
LANGUAGE sql
AS $$
  WITH deleted AS (
    DELETE FROM rate_limits
    WHERE updated_at < NOW() - (older_than_seconds || ' seconds')::interval
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM deleted;
$$;
