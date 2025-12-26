-- Phase 4: RLS policies for new tables
-- API Keys, Background Jobs, Webhooks, Import/Export, Print Agents
-- Uses COALESCE with missing_ok=true to fail closed (no access) when tenant_id not set

-- Enable RLS on all Phase 4 tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_job_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_agent_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_print_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_routes ENABLE ROW LEVEL SECURITY;

-- API Keys policies (fail closed: returns NULL uuid if setting missing, which never matches)
CREATE POLICY api_keys_tenant_isolation ON api_keys
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY api_keys_tenant_insert ON api_keys
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Background Jobs policies
CREATE POLICY background_jobs_tenant_isolation ON background_jobs
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY background_jobs_tenant_insert ON background_jobs
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Webhook Subscriptions policies
CREATE POLICY webhook_subscriptions_tenant_isolation ON webhook_subscriptions
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY webhook_subscriptions_tenant_insert ON webhook_subscriptions
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Webhook Outbox policies
CREATE POLICY webhook_outbox_tenant_isolation ON webhook_outbox
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY webhook_outbox_tenant_insert ON webhook_outbox
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Webhook Deliveries policies
CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY webhook_deliveries_tenant_insert ON webhook_deliveries
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Import Templates policies
CREATE POLICY import_templates_tenant_isolation ON import_templates
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY import_templates_tenant_insert ON import_templates
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Import Jobs policies
CREATE POLICY import_jobs_tenant_isolation ON import_jobs
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY import_jobs_tenant_insert ON import_jobs
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Import Job Errors policies
CREATE POLICY import_job_errors_tenant_isolation ON import_job_errors
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY import_job_errors_tenant_insert ON import_job_errors
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Export Jobs policies
CREATE POLICY export_jobs_tenant_isolation ON export_jobs
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY export_jobs_tenant_insert ON export_jobs
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Print Agents policies
CREATE POLICY print_agents_tenant_isolation ON print_agents
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY print_agents_tenant_insert ON print_agents
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Print Agent Printers policies
CREATE POLICY print_agent_printers_tenant_isolation ON print_agent_printers
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY print_agent_printers_tenant_insert ON print_agent_printers
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Print Dispatches policies
CREATE POLICY print_dispatches_tenant_isolation ON print_dispatches
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY print_dispatches_tenant_insert ON print_dispatches
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Cloud Print Providers policies
CREATE POLICY cloud_print_providers_tenant_isolation ON cloud_print_providers
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY cloud_print_providers_tenant_insert ON cloud_print_providers
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

-- Print Routes policies
CREATE POLICY print_routes_tenant_isolation ON print_routes
  USING (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);

CREATE POLICY print_routes_tenant_insert ON print_routes
  FOR INSERT WITH CHECK (tenant_id = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid);
