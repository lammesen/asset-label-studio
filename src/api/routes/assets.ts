import { withAuth } from "@/api/middleware/auth";
import { requirePermission } from "@/api/middleware/permissions";
import { createAssetSchema, updateAssetSchema, assetFiltersSchema } from "@/lib/validations";
import { createAsset, getAssetById, updateAsset, deleteAsset, listAssets, getAssetStats } from "@/services/asset-service";
import { PERMISSIONS } from "@/types/permissions";

import type { TenantContext } from "@/types/tenant";

export const handleListAssets = withAuth(
  requirePermission(PERMISSIONS.ASSET_READ, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const params = Object.fromEntries(url.searchParams);
      const parsed = assetFiltersSchema.safeParse(params);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid filters", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await listAssets(ctx, parsed.data);
      return Response.json(result);
    } catch (error) {
      console.error("List assets error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleGetAsset = withAuth(
  requirePermission(PERMISSIONS.ASSET_READ, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const assetId = url.pathname.split("/").pop();

      if (!assetId) {
        return Response.json({ error: "Asset ID required" }, { status: 400 });
      }

      const asset = await getAssetById(ctx, assetId);
      if (!asset) {
        return Response.json({ error: "Asset not found" }, { status: 404 });
      }

      return Response.json({ asset });
    } catch (error) {
      console.error("Get asset error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleCreateAsset = withAuth(
  requirePermission(PERMISSIONS.ASSET_WRITE, async (req: Request, ctx: TenantContext) => {
    try {
      const body = await req.json();
      const parsed = createAssetSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const asset = await createAsset(ctx, parsed.data);
      return Response.json({ asset }, { status: 201 });
    } catch (error) {
      console.error("Create asset error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleUpdateAsset = withAuth(
  requirePermission(PERMISSIONS.ASSET_WRITE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const assetId = url.pathname.split("/").pop();

      if (!assetId) {
        return Response.json({ error: "Asset ID required" }, { status: 400 });
      }

      const body = await req.json();
      const parsed = updateAssetSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const asset = await updateAsset(ctx, assetId, parsed.data);
      if (!asset) {
        return Response.json({ error: "Asset not found" }, { status: 404 });
      }

      return Response.json({ asset });
    } catch (error) {
      console.error("Update asset error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleDeleteAsset = withAuth(
  requirePermission(PERMISSIONS.ASSET_DELETE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const assetId = url.pathname.split("/").pop();

      if (!assetId) {
        return Response.json({ error: "Asset ID required" }, { status: 400 });
      }

      const deleted = await deleteAsset(ctx, assetId);
      if (!deleted) {
        return Response.json({ error: "Asset not found" }, { status: 404 });
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete asset error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleGetAssetStats = withAuth(
  requirePermission(PERMISSIONS.ASSET_READ, async (_req: Request, ctx: TenantContext) => {
    try {
      const stats = await getAssetStats(ctx);
      return Response.json({ stats });
    } catch (error) {
      console.error("Get asset stats error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);
