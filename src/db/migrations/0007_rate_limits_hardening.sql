-- 0007_rate_limits_hardening.sql
-- Harden rate limits table: add tenant_id, RLS, improved cleanup

-- Add tenant_id column (nullable for IP-global limits like login)
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Add index for tenant-scoped lookups
CREATE INDEX IF NOT EXISTS rate_limits_tenant_bucket_idx ON rate_limits(tenant_id, bucket) WHERE tenant_id IS NOT NULL;

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits FORCE ROW LEVEL SECURITY;

-- Policy: Allow reads/writes for matching tenant OR null tenant (global limits)
CREATE POLICY rate_limits_tenant_policy ON rate_limits
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = COALESCE(
      NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  )
  WITH CHECK (
    tenant_id IS NULL 
    OR tenant_id = COALESCE(
      NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Improved cleanup function with better performance
CREATE OR REPLACE FUNCTION cleanup_rate_limits(older_than_seconds integer DEFAULT 3600, batch_size integer DEFAULT 10000)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  total_deleted integer := 0;
  deleted_count integer;
BEGIN
  LOOP
    WITH deleted AS (
      DELETE FROM rate_limits
      WHERE ctid IN (
        SELECT ctid FROM rate_limits
        WHERE updated_at < NOW() - (older_than_seconds || ' seconds')::interval
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
      )
      RETURNING 1
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    total_deleted := total_deleted + deleted_count;
    
    EXIT WHEN deleted_count < batch_size;
    
    PERFORM pg_sleep(0.01);
  END LOOP;
  
  RETURN total_deleted;
END;
$$;

-- Schedule cleanup every 5 minutes (if pg_cron is available)
-- Uncomment if pg_cron extension is installed:
-- SELECT cron.schedule('cleanup-rate-limits', '*/5 * * * *', 'SELECT cleanup_rate_limits(3600, 10000)');
