-- Harden RLS policies to fail-closed when tenant_id setting is missing or empty
-- This migration updates policies from 0001 and 0002 to use the safer COALESCE pattern

-- Drop and recreate users policies
DROP POLICY IF EXISTS users_tenant_isolation ON users;
DROP POLICY IF EXISTS users_tenant_insert ON users;
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
CREATE POLICY users_tenant_insert ON users
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Drop and recreate sessions policies
DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
DROP POLICY IF EXISTS sessions_tenant_insert ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
CREATE POLICY sessions_tenant_insert ON sessions
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Drop and recreate assets policies
DROP POLICY IF EXISTS assets_tenant_isolation ON assets;
DROP POLICY IF EXISTS assets_tenant_insert ON assets;
CREATE POLICY assets_tenant_isolation ON assets
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
CREATE POLICY assets_tenant_insert ON assets
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Drop and recreate label_templates policies
DROP POLICY IF EXISTS label_templates_tenant_isolation ON label_templates;
DROP POLICY IF EXISTS label_templates_tenant_insert ON label_templates;
CREATE POLICY label_templates_tenant_isolation ON label_templates
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
CREATE POLICY label_templates_tenant_insert ON label_templates
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Drop and recreate template_versions policies
DROP POLICY IF EXISTS template_versions_tenant_isolation ON template_versions;
DROP POLICY IF EXISTS template_versions_tenant_insert ON template_versions;
CREATE POLICY template_versions_tenant_isolation ON template_versions
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
CREATE POLICY template_versions_tenant_insert ON template_versions
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Drop and recreate audit_logs policies
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS audit_logs_tenant_insert ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
CREATE POLICY audit_logs_tenant_insert ON audit_logs
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Drop and recreate print_jobs policies
DROP POLICY IF EXISTS print_jobs_tenant_isolation ON print_jobs;
DROP POLICY IF EXISTS print_jobs_tenant_insert ON print_jobs;
CREATE POLICY print_jobs_tenant_isolation ON print_jobs
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
CREATE POLICY print_jobs_tenant_insert ON print_jobs
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Drop and recreate print_job_items policies
DROP POLICY IF EXISTS print_job_items_tenant_isolation ON print_job_items;
DROP POLICY IF EXISTS print_job_items_tenant_insert ON print_job_items;
CREATE POLICY print_job_items_tenant_isolation ON print_job_items
  USING (
    EXISTS (
      SELECT 1 FROM print_jobs
      WHERE print_jobs.id = print_job_items.job_id
      AND print_jobs.tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid
    )
  );
CREATE POLICY print_job_items_tenant_insert ON print_job_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM print_jobs
      WHERE print_jobs.id = print_job_items.job_id
      AND print_jobs.tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid
    )
  );
