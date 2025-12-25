/**
 * Permission system for the Asset Label Creation Studio
 * All permissions are tenant-scoped
 */

export const PERMISSIONS = {
  // Asset permissions
  ASSET_READ: "asset:read",
  ASSET_WRITE: "asset:write",
  ASSET_DELETE: "asset:delete",

  // Template permissions
  TEMPLATE_READ: "template:read",
  TEMPLATE_WRITE: "template:write",
  TEMPLATE_PUBLISH: "template:publish",

  // Print permissions
  PRINT_EXECUTE: "print:execute",
  PRINT_ADMIN: "print:admin",
  PRINT_AGENT: "print:agent",

  // User management permissions
  USER_READ: "user:read",
  USER_MANAGE: "user:manage",

  INTEGRATION_MANAGE: "integration:manage",
  IMPORT_EXECUTE: "import:execute",
  EXPORT_READ: "export:read",
  WEBHOOK_MANAGE: "webhook:manage",

  // Tenant administration
  TENANT_ADMIN: "tenant:admin",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Default permissions for each role
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    PERMISSIONS.ASSET_READ,
    PERMISSIONS.ASSET_WRITE,
    PERMISSIONS.ASSET_DELETE,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.TEMPLATE_WRITE,
    PERMISSIONS.TEMPLATE_PUBLISH,
    PERMISSIONS.PRINT_EXECUTE,
    PERMISSIONS.PRINT_ADMIN,
    PERMISSIONS.PRINT_AGENT,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.INTEGRATION_MANAGE,
    PERMISSIONS.IMPORT_EXECUTE,
    PERMISSIONS.EXPORT_READ,
    PERMISSIONS.WEBHOOK_MANAGE,
    PERMISSIONS.TENANT_ADMIN,
  ],
  manager: [
    PERMISSIONS.ASSET_READ,
    PERMISSIONS.ASSET_WRITE,
    PERMISSIONS.ASSET_DELETE,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.TEMPLATE_WRITE,
    PERMISSIONS.TEMPLATE_PUBLISH,
    PERMISSIONS.PRINT_EXECUTE,
    PERMISSIONS.PRINT_ADMIN,
    PERMISSIONS.USER_READ,
    PERMISSIONS.IMPORT_EXECUTE,
    PERMISSIONS.EXPORT_READ,
  ],
  user: [
    PERMISSIONS.ASSET_READ,
    PERMISSIONS.ASSET_WRITE,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.PRINT_EXECUTE,
    PERMISSIONS.EXPORT_READ,
  ],
  viewer: [
    PERMISSIONS.ASSET_READ,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.EXPORT_READ,
  ],
} as const;

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
