import { z } from "zod";

import {
  withApiKeyAuth,
  requireApiKeyPermission,
  apiKeyContextToTenantContext,
} from "@/api/middleware/api-key";
import { listAssets, getAssetById, createAsset } from "@/services/asset-service";
import { listTemplates, getTemplateById } from "@/services/template-service";
import { createPrintJob, getPrintJob, renderPrintJob } from "@/services/print-service";
import { createAssetSchema } from "@/lib/validations";
import { PERMISSIONS } from "@/types/permissions";

import type { ApiKeyContext } from "@/types/api-key";

type PublicApiHandler = (req: Request, ctx: ApiKeyContext) => Promise<Response>;

function withApiKey(handler: PublicApiHandler) {
  return async (req: Request): Promise<Response> => {
    const result = await withApiKeyAuth(req);
    
    if ("error" in result) {
      return result.error;
    }
    
    return handler(req, result.ctx);
  };
}

export const handlePublicListAssets = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.ASSET_READ);
  if (permissionError) return permissionError;
  
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
    const category = url.searchParams.get("category") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const result = await listAssets(tenantCtx, {
      category,
      status,
      page,
      pageSize,
    } as Parameters<typeof listAssets>[1]);
    
    return Response.json(result);
  } catch (error) {
    console.error("Public API list assets error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const handlePublicGetAsset = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.ASSET_READ);
  if (permissionError) return permissionError;
  
  try {
    const url = new URL(req.url);
    const assetId = url.pathname.split("/").pop();
    
    if (!assetId) {
      return Response.json({ error: "Asset ID required" }, { status: 400 });
    }
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const asset = await getAssetById(tenantCtx, assetId);
    
    if (!asset) {
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }
    
    return Response.json({ asset });
  } catch (error) {
    console.error("Public API get asset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const handlePublicCreateAsset = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.ASSET_WRITE);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const parsed = createAssetSchema.safeParse(body);
    
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const asset = await createAsset(tenantCtx, parsed.data);
    
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Public API create asset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const handlePublicListTemplates = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.TEMPLATE_READ);
  if (permissionError) return permissionError;
  
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const result = await listTemplates(tenantCtx, { isPublished: true }, page, pageSize);
    
    return Response.json(result);
  } catch (error) {
    console.error("Public API list templates error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const handlePublicGetTemplate = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.TEMPLATE_READ);
  if (permissionError) return permissionError;
  
  try {
    const url = new URL(req.url);
    const templateId = url.pathname.split("/").pop();
    
    if (!templateId) {
      return Response.json({ error: "Template ID required" }, { status: 400 });
    }
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const template = await getTemplateById(tenantCtx, templateId);
    
    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }
    
    return Response.json({ template });
  } catch (error) {
    console.error("Public API get template error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});

const createPrintJobSchema = z.object({
  templateId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1).max(100),
  options: z.object({
    outputFormat: z.enum(["pdf", "png"]).optional(),
    copies: z.number().int().min(1).max(100).optional(),
    useSheetLayout: z.boolean().optional(),
    paperSize: z.enum(["letter", "a4", "custom"]).optional(),
    dpi: z.number().int().min(72).max(600).optional(),
  }).optional(),
});

export const handlePublicCreatePrintJob = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.PRINT_EXECUTE);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const parsed = createPrintJobSchema.safeParse(body);
    
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const job = await createPrintJob(tenantCtx, parsed.data);
    
    return Response.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Public API create print job error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const handlePublicGetPrintJob = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.PRINT_EXECUTE);
  if (permissionError) return permissionError;
  
  try {
    const url = new URL(req.url);
    const jobId = url.pathname.split("/").pop();
    
    if (!jobId) {
      return Response.json({ error: "Job ID required" }, { status: 400 });
    }
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const job = await getPrintJob(tenantCtx, jobId);
    
    if (!job) {
      return Response.json({ error: "Print job not found" }, { status: 404 });
    }
    
    return Response.json({ job });
  } catch (error) {
    console.error("Public API get print job error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const handlePublicRenderPrintJob = withApiKey(async (req: Request, ctx: ApiKeyContext) => {
  const permissionError = requireApiKeyPermission(ctx, PERMISSIONS.PRINT_EXECUTE);
  if (permissionError) return permissionError;
  
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const jobId = pathParts[pathParts.length - 2];
    
    if (!jobId) {
      return Response.json({ error: "Job ID required" }, { status: 400 });
    }
    
    const tenantCtx = apiKeyContextToTenantContext(ctx);
    const result = await renderPrintJob(tenantCtx, jobId);
    
    const body = new Uint8Array(result.buffer);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="print-job-${jobId}.pdf"`,
        "Content-Length": body.length.toString(),
      },
    });
  } catch (error) {
    console.error("Public API render print job error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
});
