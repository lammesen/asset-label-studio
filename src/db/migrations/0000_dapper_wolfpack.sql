CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"type" varchar(100) NOT NULL,
	"asset_tag" varchar(100) NOT NULL,
	"serial_number" varchar(255) NOT NULL,
	"manufacturer" varchar(255) NOT NULL,
	"model" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"department" varchar(255),
	"assigned_to" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"purchase_date" date,
	"warranty_expiry" date,
	"retired_date" date,
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"resource_type" varchar(100),
	"resource_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_at" timestamp,
	"locked_by" varchar(100),
	"payload" jsonb NOT NULL,
	"result" jsonb,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_print_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"entity" varchar(50) DEFAULT 'asset' NOT NULL,
	"format" varchar(10) NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"output_mime" varchar(100),
	"output_bytes" integer,
	"output_storage_key" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_job_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"field" varchar(100),
	"message" text NOT NULL,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"source_type" varchar(10) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"template_id" uuid,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"success_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"entity" varchar(50) DEFAULT 'asset' NOT NULL,
	"mapping" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50),
	"format" varchar(50) NOT NULL,
	"spec" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"is_system_template" boolean DEFAULT false NOT NULL,
	"thumbnail_url" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_agent_printers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"driver" varchar(255),
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dpi" integer,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'offline' NOT NULL,
	"last_seen_at" timestamp,
	"version" varchar(50),
	"capabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_dispatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"print_job_id" uuid NOT NULL,
	"agent_id" uuid,
	"printer_id" uuid,
	"payload_format" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"template_version" integer NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"options" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"output_url" text,
	"output_size" integer,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "print_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"match" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"destination" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"spec" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"change_note" text
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"domain" varchar(255),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outbox_id" uuid NOT NULL,
	"request_headers" jsonb,
	"request_body" jsonb,
	"response_status" integer,
	"response_headers" jsonb,
	"response_body" text,
	"duration_ms" integer,
	"attempt_number" integer NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_id" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp,
	"last_attempt_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret_hash" varchar(255) NOT NULL,
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_print_providers" ADD CONSTRAINT "cloud_print_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_print_providers" ADD CONSTRAINT "cloud_print_providers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_errors" ADD CONSTRAINT "import_job_errors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_errors" ADD CONSTRAINT "import_job_errors_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_template_id_import_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."import_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_agent_printers" ADD CONSTRAINT "print_agent_printers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_agent_printers" ADD CONSTRAINT "print_agent_printers_agent_id_print_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."print_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_agents" ADD CONSTRAINT "print_agents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_agents" ADD CONSTRAINT "print_agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_dispatches" ADD CONSTRAINT "print_dispatches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_dispatches" ADD CONSTRAINT "print_dispatches_print_job_id_print_jobs_id_fk" FOREIGN KEY ("print_job_id") REFERENCES "public"."print_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_dispatches" ADD CONSTRAINT "print_dispatches_agent_id_print_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."print_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_dispatches" ADD CONSTRAINT "print_dispatches_printer_id_print_agent_printers_id_fk" FOREIGN KEY ("printer_id") REFERENCES "public"."print_agent_printers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_job_items" ADD CONSTRAINT "print_job_items_job_id_print_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."print_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_job_items" ADD CONSTRAINT "print_job_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_template_id_label_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."label_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_routes" ADD CONSTRAINT "print_routes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_label_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."label_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_outbox_id_webhook_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."webhook_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_outbox" ADD CONSTRAINT "webhook_outbox_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_outbox" ADD CONSTRAINT "webhook_outbox_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_tenant_created_idx" ON "api_keys" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "api_keys_tenant_user_idx" ON "api_keys" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "assets_tenant_created_idx" ON "assets" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "assets_tenant_serial_idx" ON "assets" USING btree ("tenant_id","serial_number");--> statement-breakpoint
CREATE INDEX "assets_tenant_tag_idx" ON "assets" USING btree ("tenant_id","asset_tag");--> statement-breakpoint
CREATE INDEX "assets_tenant_status_idx" ON "assets" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "assets_tenant_category_idx" ON "assets" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_action_idx" ON "audit_logs" USING btree ("tenant_id","action");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_user_idx" ON "audit_logs" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "background_jobs_status_run_idx" ON "background_jobs" USING btree ("status","run_after","priority");--> statement-breakpoint
CREATE INDEX "background_jobs_tenant_created_idx" ON "background_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "background_jobs_type_status_idx" ON "background_jobs" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "cloud_print_providers_tenant_idx" ON "cloud_print_providers" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "export_jobs_tenant_created_idx" ON "export_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "export_jobs_tenant_status_idx" ON "export_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "import_job_errors_job_idx" ON "import_job_errors" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "import_jobs_tenant_created_idx" ON "import_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "import_jobs_tenant_status_idx" ON "import_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "import_templates_tenant_created_idx" ON "import_templates" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "templates_tenant_created_idx" ON "label_templates" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "templates_tenant_category_idx" ON "label_templates" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "templates_tenant_published_idx" ON "label_templates" USING btree ("tenant_id","is_published");--> statement-breakpoint
CREATE INDEX "print_agent_printers_agent_idx" ON "print_agent_printers" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "print_agent_printers_tenant_idx" ON "print_agent_printers" USING btree ("tenant_id","agent_id");--> statement-breakpoint
CREATE INDEX "print_agents_tenant_status_idx" ON "print_agents" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "print_agents_tenant_created_idx" ON "print_agents" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "print_dispatches_tenant_created_idx" ON "print_dispatches" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "print_dispatches_tenant_status_idx" ON "print_dispatches" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "print_dispatches_job_idx" ON "print_dispatches" USING btree ("print_job_id");--> statement-breakpoint
CREATE INDEX "print_job_items_job_idx" ON "print_job_items" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "print_job_items_asset_idx" ON "print_job_items" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "print_jobs_tenant_created_idx" ON "print_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "print_jobs_tenant_status_idx" ON "print_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "print_jobs_tenant_template_idx" ON "print_jobs" USING btree ("tenant_id","template_id");--> statement-breakpoint
CREATE INDEX "print_routes_tenant_priority_idx" ON "print_routes" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_tenant_expires_idx" ON "sessions" USING btree ("tenant_id","expires_at");--> statement-breakpoint
CREATE INDEX "sessions_tenant_user_idx" ON "sessions" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "template_versions_tenant_idx" ON "template_versions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "template_versions_template_idx" ON "template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "users_tenant_created_idx" ON "users" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_outbox_idx" ON "webhook_deliveries" USING btree ("outbox_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_tenant_created_idx" ON "webhook_deliveries" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_outbox_status_retry_idx" ON "webhook_outbox" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX "webhook_outbox_tenant_event_idx" ON "webhook_outbox" USING btree ("tenant_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "webhook_outbox_event_id_idx" ON "webhook_outbox" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "webhook_subs_tenant_active_idx" ON "webhook_subscriptions" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "webhook_subs_tenant_created_idx" ON "webhook_subscriptions" USING btree ("tenant_id","created_at");