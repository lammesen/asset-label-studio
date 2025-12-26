-- Add GIN index on assets.custom_fields for efficient JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_custom_fields_gin ON assets USING GIN (custom_fields);
