-- Enable Row Level Security on tenant-scoped tables
-- Run this migration after the initial schema is created

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY users_tenant_insert ON users
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_tenant_isolation ON sessions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY sessions_tenant_insert ON sessions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_tenant_isolation ON assets
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY assets_tenant_insert ON assets
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on label_templates table
ALTER TABLE label_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY label_templates_tenant_isolation ON label_templates
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY label_templates_tenant_insert ON label_templates
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on template_versions table
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY template_versions_tenant_isolation ON template_versions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY template_versions_tenant_insert ON template_versions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY audit_logs_tenant_insert ON audit_logs
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Bypass RLS for the application role (for admin operations)
-- The application should use SET LOCAL app.current_tenant_id before queries
-- For superuser/admin operations, use a separate role with BYPASSRLS
