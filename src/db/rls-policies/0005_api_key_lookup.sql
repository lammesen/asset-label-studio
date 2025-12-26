-- 0005_api_key_lookup.sql
-- SECURITY DEFINER function for pre-tenant API key lookup
-- Required because we need to validate API key before knowing tenant

CREATE OR REPLACE FUNCTION public.lookup_api_key(p_key_hash text)
RETURNS TABLE (
  api_key_id uuid,
  tenant_id uuid,
  user_id uuid,
  permissions jsonb,
  expires_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tenant_id, user_id, permissions, expires_at, revoked_at
  FROM api_keys
  WHERE key_hash = p_key_hash
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_api_key(text) FROM PUBLIC;
