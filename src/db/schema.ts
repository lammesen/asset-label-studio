import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  settings: jsonb("settings").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("users_tenant_email_idx").on(table.tenantId, table.email),
    index("users_tenant_created_idx").on(table.tenantId, table.createdAt),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
    index("sessions_tenant_expires_idx").on(table.tenantId, table.expiresAt),
    index("sessions_tenant_user_idx").on(table.tenantId, table.userId),
  ]
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    assetTag: varchar("asset_tag", { length: 100 }).notNull(),
    serialNumber: varchar("serial_number", { length: 255 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 255 }).notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    department: varchar("department", { length: 255 }),
    assignedTo: varchar("assigned_to", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    purchaseDate: date("purchase_date"),
    warrantyExpiry: date("warranty_expiry"),
    retiredDate: date("retired_date"),
    notes: text("notes"),
    customFields: jsonb("custom_fields").notNull().default({}),
    schemaVersion: integer("schema_version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("assets_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("assets_tenant_serial_idx").on(table.tenantId, table.serialNumber),
    index("assets_tenant_tag_idx").on(table.tenantId, table.assetTag),
    index("assets_tenant_status_idx").on(table.tenantId, table.status),
    index("assets_tenant_category_idx").on(table.tenantId, table.category),
  ]
);

export const labelTemplates = pgTable(
  "label_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }),
    format: varchar("format", { length: 50 }).notNull(),
    spec: jsonb("spec").notNull(),
    version: integer("version").notNull().default(1),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at"),
    isSystemTemplate: boolean("is_system_template").notNull().default(false),
    thumbnailUrl: text("thumbnail_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("templates_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("templates_tenant_category_idx").on(table.tenantId, table.category),
    index("templates_tenant_published_idx").on(table.tenantId, table.isPublished),
  ]
);

export const templateVersions = pgTable(
  "template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => labelTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    spec: jsonb("spec").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    changeNote: text("change_note"),
  },
  (table) => [
    index("template_versions_tenant_idx").on(table.tenantId),
    index("template_versions_template_idx").on(table.templateId),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull().default("info"),
    resourceType: varchar("resource_type", { length: 100 }),
    resourceId: uuid("resource_id"),
    details: jsonb("details").notNull().default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("audit_logs_tenant_action_idx").on(table.tenantId, table.action),
    index("audit_logs_tenant_user_idx").on(table.tenantId, table.userId),
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
  ]
);

export const printJobs = pgTable(
  "print_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => labelTemplates.id),
    templateVersion: integer("template_version").notNull(),
    templateName: varchar("template_name", { length: 255 }).notNull(),
    options: jsonb("options").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    itemCount: integer("item_count").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    errorMessage: text("error_message"),
    outputUrl: text("output_url"),
    outputSize: integer("output_size"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("print_jobs_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("print_jobs_tenant_status_idx").on(table.tenantId, table.status),
    index("print_jobs_tenant_template_idx").on(table.tenantId, table.templateId),
  ]
);

export const printJobItems = pgTable(
  "print_job_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => printJobs.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    sequence: integer("sequence").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
  },
  (table) => [
    index("print_job_items_job_idx").on(table.jobId),
    index("print_job_items_asset_idx").on(table.assetId),
  ]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    permissions: jsonb("permissions").notNull().default([]),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("api_keys_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("api_keys_tenant_user_idx").on(table.tenantId, table.userId),
    index("api_keys_key_hash_idx").on(table.keyHash),
  ]
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    runAfter: timestamp("run_after").notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedAt: timestamp("locked_at"),
    lockedBy: varchar("locked_by", { length: 100 }),
    payload: jsonb("payload").notNull(),
    result: jsonb("result"),
    errorMessage: text("error_message"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("background_jobs_status_run_idx").on(table.status, table.runAfter, table.priority),
    index("background_jobs_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("background_jobs_type_status_idx").on(table.type, table.status),
  ]
);

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    secretHash: varchar("secret_hash", { length: 255 }).notNull(),
    eventTypes: jsonb("event_types").notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("webhook_subs_tenant_active_idx").on(table.tenantId, table.isActive),
    index("webhook_subs_tenant_created_idx").on(table.tenantId, table.createdAt),
  ]
);

export const webhookOutbox = pgTable(
  "webhook_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    eventId: varchar("event_id", { length: 64 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at"),
    lastAttemptAt: timestamp("last_attempt_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at"),
  },
  (table) => [
    index("webhook_outbox_status_retry_idx").on(table.status, table.nextRetryAt),
    index("webhook_outbox_tenant_event_idx").on(table.tenantId, table.eventType, table.createdAt),
    index("webhook_outbox_event_id_idx").on(table.eventId),
  ]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    outboxId: uuid("outbox_id")
      .notNull()
      .references(() => webhookOutbox.id, { onDelete: "cascade" }),
    requestHeaders: jsonb("request_headers"),
    requestBody: jsonb("request_body"),
    responseStatus: integer("response_status"),
    responseHeaders: jsonb("response_headers"),
    responseBody: text("response_body"),
    durationMs: integer("duration_ms"),
    attemptNumber: integer("attempt_number").notNull(),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("webhook_deliveries_outbox_idx").on(table.outboxId),
    index("webhook_deliveries_tenant_created_idx").on(table.tenantId, table.createdAt),
  ]
);

export const importTemplates = pgTable(
  "import_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    entity: varchar("entity", { length: 50 }).notNull().default("asset"),
    mapping: jsonb("mapping").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("import_templates_tenant_created_idx").on(table.tenantId, table.createdAt),
  ]
);

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    sourceType: varchar("source_type", { length: 10 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    templateId: uuid("template_id").references(() => importTemplates.id),
    totalRows: integer("total_rows").notNull().default(0),
    processedRows: integer("processed_rows").notNull().default(0),
    successRows: integer("success_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    summary: jsonb("summary").notNull().default({}),
  },
  (table) => [
    index("import_jobs_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("import_jobs_tenant_status_idx").on(table.tenantId, table.status),
  ]
);

export const importJobErrors = pgTable(
  "import_job_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    field: varchar("field", { length: 100 }),
    message: text("message").notNull(),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("import_job_errors_job_idx").on(table.jobId),
  ]
);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    entity: varchar("entity", { length: 50 }).notNull().default("asset"),
    format: varchar("format", { length: 10 }).notNull(),
    filters: jsonb("filters").notNull().default({}),
    totalRows: integer("total_rows").notNull().default(0),
    outputMime: varchar("output_mime", { length: 100 }),
    outputBytes: integer("output_bytes"),
    outputStorageKey: text("output_storage_key"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("export_jobs_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("export_jobs_tenant_status_idx").on(table.tenantId, table.status),
  ]
);

export const printAgents = pgTable(
  "print_agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("offline"),
    lastSeenAt: timestamp("last_seen_at"),
    version: varchar("version", { length: 50 }),
    capabilities: jsonb("capabilities").notNull().default({}),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("print_agents_tenant_status_idx").on(table.tenantId, table.status),
    index("print_agents_tenant_created_idx").on(table.tenantId, table.createdAt),
  ]
);

export const printAgentPrinters = pgTable(
  "print_agent_printers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => printAgents.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    driver: varchar("driver", { length: 255 }),
    languages: jsonb("languages").notNull().default([]),
    dpi: integer("dpi"),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [
    index("print_agent_printers_agent_idx").on(table.agentId),
    index("print_agent_printers_tenant_idx").on(table.tenantId, table.agentId),
  ]
);

export const printDispatches = pgTable(
  "print_dispatches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    printJobId: uuid("print_job_id")
      .notNull()
      .references(() => printJobs.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => printAgents.id),
    printerId: uuid("printer_id").references(() => printAgentPrinters.id),
    payloadFormat: varchar("payload_format", { length: 10 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("print_dispatches_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("print_dispatches_tenant_status_idx").on(table.tenantId, table.status),
    index("print_dispatches_job_idx").on(table.printJobId),
  ]
);

export const cloudPrintProviders = pgTable(
  "cloud_print_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    config: jsonb("config").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("cloud_print_providers_tenant_idx").on(table.tenantId, table.provider),
  ]
);

export const printRoutes = pgTable(
  "print_routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    match: jsonb("match").notNull().default({}),
    destination: jsonb("destination").notNull(),
    priority: integer("priority").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("print_routes_tenant_priority_idx").on(table.tenantId, table.priority),
  ]
);
