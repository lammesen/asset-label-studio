import { z } from "zod";

import { withAuth } from "@/api/middleware/auth";
import { requirePermission } from "@/api/middleware/permissions";
import {
  createApiKey,
  getApiKey,
  listApiKeys,
  updateApiKey,
  revokeApiKey,
} from "@/services/api-key-service";
import { PERMISSIONS, type Permission } from "@/types/permissions";

import type { TenantContext } from "@/types/tenant";

const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.array(z.string()).min(1),
  expiresAt: z.string().datetime().optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  permissions: z.array(z.string()).min(1).optional(),
});

export const handleListApiKeys = withAuth(
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

      const result = await listApiKeys(ctx, page, pageSize);
      return Response.json(result);
    } catch (error) {
      console.error("List API keys error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleGetApiKey = withAuth(
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const keyId = url.pathname.split("/").pop();

      if (!keyId) {
        return Response.json({ error: "API key ID required" }, { status: 400 });
      }

      const key = await getApiKey(ctx, keyId);
      if (!key) {
        return Response.json({ error: "API key not found" }, { status: 404 });
      }

      return Response.json({ key });
    } catch (error) {
      console.error("Get API key error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleCreateApiKey = withAuth(
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const body = await req.json();
      const parsed = createApiKeySchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const key = await createApiKey(ctx, {
        name: parsed.data.name,
        permissions: parsed.data.permissions as Permission[],
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      });

      return Response.json({ key }, { status: 201 });
    } catch (error) {
      console.error("Create API key error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleUpdateApiKey = withAuth(
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const keyId = url.pathname.split("/").pop();

      if (!keyId) {
        return Response.json({ error: "API key ID required" }, { status: 400 });
      }

      const body = await req.json();
      const parsed = updateApiKeySchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const key = await updateApiKey(ctx, keyId, {
        name: parsed.data.name,
        permissions: parsed.data.permissions as Permission[] | undefined,
      });

      if (!key) {
        return Response.json({ error: "API key not found" }, { status: 404 });
      }

      return Response.json({ key });
    } catch (error) {
      console.error("Update API key error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleRevokeApiKey = withAuth(
  requirePermission(PERMISSIONS.INTEGRATION_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const keyId = url.pathname.split("/").pop();

      if (!keyId) {
        return Response.json({ error: "API key ID required" }, { status: 400 });
      }

      const success = await revokeApiKey(ctx, keyId);
      if (!success) {
        return Response.json({ error: "API key not found or already revoked" }, { status: 404 });
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Revoke API key error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);
