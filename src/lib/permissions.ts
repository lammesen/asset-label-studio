import type { TenantContext } from "@/types/tenant";
import type { Permission, Role } from "@/types/permissions";
import { ROLE_PERMISSIONS } from "@/types/permissions";

export function getPermissionsForRole(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasPermission(
  ctx: TenantContext,
  permission: Permission
): boolean {
  return ctx.permissions.includes(permission);
}

export function hasAnyPermission(
  ctx: TenantContext,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => ctx.permissions.includes(p));
}

export function hasAllPermissions(
  ctx: TenantContext,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => ctx.permissions.includes(p));
}

export class PermissionError extends Error {
  public readonly permission: Permission;
  public readonly statusCode = 403;

  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionError";
    this.permission = permission;
  }
}

export function requirePermission(
  ctx: TenantContext,
  permission: Permission
): void {
  if (!hasPermission(ctx, permission)) {
    throw new PermissionError(permission);
  }
}

export function requireAnyPermission(
  ctx: TenantContext,
  permissions: Permission[]
): void {
  if (!hasAnyPermission(ctx, permissions)) {
    const firstPermission = permissions[0];
    if (!firstPermission) {
      throw new Error("No permissions provided");
    }
    throw new PermissionError(firstPermission);
  }
}

export function requireAllPermissions(
  ctx: TenantContext,
  permissions: Permission[]
): void {
  for (const permission of permissions) {
    if (!hasPermission(ctx, permission)) {
      throw new PermissionError(permission);
    }
  }
}
