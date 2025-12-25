import { hasPermission, hasAnyPermission, PermissionError } from "@/lib/permissions";

import type { TenantContext } from "@/types/tenant";
import type { Permission } from "@/types/permissions";
import type { AuthenticatedHandler } from "./auth";

export function requirePermission(
  permission: Permission,
  handler: AuthenticatedHandler
): AuthenticatedHandler {
  return async (req: Request, ctx: TenantContext): Promise<Response> => {
    if (!hasPermission(ctx, permission)) {
      return Response.json(
        { error: `Permission denied: ${permission}` },
        { status: 403 }
      );
    }
    return handler(req, ctx);
  };
}

export function requireAnyPermission(
  permissions: Permission[],
  handler: AuthenticatedHandler
): AuthenticatedHandler {
  return async (req: Request, ctx: TenantContext): Promise<Response> => {
    if (!hasAnyPermission(ctx, permissions)) {
      return Response.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }
    return handler(req, ctx);
  };
}

export function handlePermissionError(error: unknown): Response {
  if (error instanceof PermissionError) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }
  throw error;
}
