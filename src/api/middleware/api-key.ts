import { validateApiKey } from "@/services/api-key-service";
import type { Permission } from "@/types/permissions";
import type { ApiKeyContext } from "@/types/api-key";

const API_KEY_HEADER = "x-api-key";

export async function withApiKeyAuth(
  req: Request
): Promise<{ ctx: ApiKeyContext } | { error: Response }> {
  const apiKey = req.headers.get(API_KEY_HEADER);

  if (!apiKey) {
    return {
      error: Response.json(
        { error: "API key required" },
        { status: 401 }
      ),
    };
  }

  const ctx = await validateApiKey(apiKey);

  if (!ctx) {
    return {
      error: Response.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      ),
    };
  }

  return { ctx };
}

export function requireApiKeyPermission(
  ctx: ApiKeyContext,
  permission: Permission
): Response | null {
  if (!ctx.permissions.includes(permission)) {
    return Response.json(
      { error: `Permission denied: ${permission}` },
      { status: 403 }
    );
  }
  return null;
}

export function requireApiKeyPermissions(
  ctx: ApiKeyContext,
  permissions: Permission[]
): Response | null {
  for (const permission of permissions) {
    if (!ctx.permissions.includes(permission)) {
      return Response.json(
        { error: `Permission denied: ${permission}` },
        { status: 403 }
      );
    }
  }
  return null;
}

export function apiKeyContextToTenantContext(ctx: ApiKeyContext) {
  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    permissions: ctx.permissions,
    sessionId: `api-key-${ctx.apiKeyId}`,
  };
}
