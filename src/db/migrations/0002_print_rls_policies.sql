-- Enable Row Level Security on print tables
-- Run this migration after 0001_rls_policies.sql

-- Enable RLS on print_jobs table
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY print_jobs_tenant_isolation ON print_jobs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY print_jobs_tenant_insert ON print_jobs
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- print_job_items uses job_id FK to inherit tenant isolation from print_jobs
ALTER TABLE print_job_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY print_job_items_tenant_isolation ON print_job_items
  USING (
    EXISTS (
      SELECT 1 FROM print_jobs
      WHERE print_jobs.id = print_job_items.job_id
      AND print_jobs.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );
CREATE POLICY print_job_items_tenant_insert ON print_job_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM print_jobs
      WHERE print_jobs.id = print_job_items.job_id
      AND print_jobs.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );
