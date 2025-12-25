/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: "auth.login",
  LOGOUT: "auth.logout",
  LOGIN_FAILED: "auth.login_failed",
  PASSWORD_CHANGED: "auth.password_changed",
  TOKEN_REFRESHED: "auth.token_refreshed",
  TOKEN_REUSE_DETECTED: "auth.token_reuse_detected",
  
  // User management
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  USER_ROLE_CHANGED: "user.role_changed",
  
  // Asset management
  ASSET_CREATED: "asset.created",
  ASSET_UPDATED: "asset.updated",
  ASSET_DELETED: "asset.deleted",
  ASSET_STATUS_CHANGED: "asset.status_changed",
  
  // Template management
  TEMPLATE_CREATED: "template.created",
  TEMPLATE_UPDATED: "template.updated",
  TEMPLATE_DELETED: "template.deleted",
  TEMPLATE_PUBLISHED: "template.published",
  
  // Print operations
  PRINT_JOB_CREATED: "print.job_created",
  PRINT_JOB_RENDERED: "print.job_rendered",
  PRINT_JOB_COMPLETED: "print.job_completed",
  PRINT_JOB_FAILED: "print.job_failed",
  PRINT_JOB_CANCELLED: "print.job_cancelled",
  
  // Export/Import
  EXPORT_EXECUTED: "export.executed",
  EXPORT_CREATED: "export.created",
  EXPORT_COMPLETED: "export.completed",
  EXPORT_FAILED: "export.failed",
  IMPORT_EXECUTED: "import.executed",
  IMPORT_STARTED: "import.started",
  IMPORT_COMPLETED: "import.completed",
  IMPORT_FAILED: "import.failed",
  
  // API Key management
  API_KEY_CREATED: "api_key.created",
  API_KEY_UPDATED: "api_key.updated",
  API_KEY_REVOKED: "api_key.revoked",
  
  // Webhook management
  WEBHOOK_SUBSCRIPTION_CREATED: "webhook.subscription_created",
  WEBHOOK_SUBSCRIPTION_UPDATED: "webhook.subscription_updated",
  WEBHOOK_SUBSCRIPTION_DELETED: "webhook.subscription_deleted",
  WEBHOOK_DELIVERED: "webhook.delivered",
  WEBHOOK_FAILED: "webhook.failed",
  
  // Print Agent management
  PRINT_AGENT_REGISTERED: "print.agent_registered",
  PRINT_AGENT_UPDATED: "print.agent_updated",
  PRINT_DISPATCHED: "print.dispatched",
  PRINT_DISPATCH_COMPLETED: "print.dispatch_completed",
  PRINT_DISPATCH_FAILED: "print.dispatch_failed",
  
  // Cloud Print
  CLOUD_PRINT_SUBMITTED: "cloud_print.submitted",
  CLOUD_PRINT_COMPLETED: "cloud_print.completed",
  CLOUD_PRINT_FAILED: "cloud_print.failed",
  
  // Tenant management
  TENANT_SETTINGS_UPDATED: "tenant.settings_updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Audit log severity levels
 */
export const AUDIT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
} as const;

export type AuditSeverity = (typeof AUDIT_SEVERITY)[keyof typeof AUDIT_SEVERITY];

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  
  // Action details
  action: AuditAction;
  severity: AuditSeverity;
  
  // Resource being acted upon
  resourceType: string | null;
  resourceId: string | null;
  
  // Details
  details: Record<string, unknown>;
  
  // Request context
  ipAddress: string | null;
  userAgent: string | null;
  
  // Timestamp
  createdAt: Date;
}

/**
 * Audit log creation input
 */
export interface CreateAuditLogInput {
  action: AuditAction;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log filters
 */
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Audit log list result
 */
export interface AuditLogListResult {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}
