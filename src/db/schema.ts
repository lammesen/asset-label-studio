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
