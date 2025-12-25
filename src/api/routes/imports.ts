import { z } from "zod";

import { withAuth } from "@/api/middleware/auth";
import { requirePermission } from "@/api/middleware/permissions";
import {
  createImportJob,
  getImportJob,
  listImportJobs,
  getImportJobErrors,
  createImportTemplate,
  listImportTemplates,
  deleteImportTemplate,
} from "@/services/import-service";
import { exportAssets } from "@/services/export-service";
import { PERMISSIONS } from "@/types/permissions";
import { IMPORT_SOURCE_TYPES, EXPORT_FORMATS } from "@/types/import-export";

import type { TenantContext } from "@/types/tenant";
import type { ImportSourceType, ExportFormat, ImportTemplateMapping } from "@/types/import-export";

const sourceTypeValues = Object.values(IMPORT_SOURCE_TYPES) as [string, ...string[]];
const exportFormatValues = Object.values(EXPORT_FORMATS) as [string, ...string[]];

const createImportTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  mapping: z.object({
    entity: z.literal("asset"),
    columns: z.array(z.object({
      column: z.string(),
      to: z.string(),
      required: z.boolean().optional(),
      transforms: z.array(z.object({
        kind: z.enum(["trim", "upper", "lower", "date", "default"]),
        value: z.string().optional(),
        format: z.string().optional(),
      })).optional(),
    })),
    defaults: z.record(z.string(), z.unknown()).optional(),
  }),
});

const exportFiltersSchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
});

export const handleListImportJobs = withAuth(
  requirePermission(PERMISSIONS.IMPORT_EXECUTE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

      const result = await listImportJobs(ctx, page, pageSize);
      return Response.json(result);
    } catch (error) {
      console.error("List import jobs error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleGetImportJob = withAuth(
  requirePermission(PERMISSIONS.IMPORT_EXECUTE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const jobId = url.pathname.split("/").pop();

      if (!jobId) {
        return Response.json({ error: "Job ID required" }, { status: 400 });
      }

      const job = await getImportJob(ctx, jobId);
      if (!job) {
        return Response.json({ error: "Import job not found" }, { status: 404 });
      }

      return Response.json({ job });
    } catch (error) {
      console.error("Get import job error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const handleCreateImportJob = withAuth(
  requirePermission(PERMISSIONS.IMPORT_EXECUTE, async (req: Request, ctx: TenantContext) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const templateId = formData.get("templateId") as string | null;
      const mappingStr = formData.get("mapping") as string | null;

      if (!file) {
        return Response.json({ error: "File is required" }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return Response.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      const fileName = file.name;
      let sourceType: ImportSourceType;

      if (fileName.endsWith(".csv")) {
        sourceType = IMPORT_SOURCE_TYPES.CSV;
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        sourceType = IMPORT_SOURCE_TYPES.XLSX;
      } else {
        return Response.json({ error: "Invalid file type. Must be CSV or Excel" }, { status: 400 });
      }

      const fileContent = Buffer.from(await file.arrayBuffer());
      let mappingOverride: ImportTemplateMapping | undefined;

      if (mappingStr) {
        try {
          mappingOverride = JSON.parse(mappingStr);
        } catch {
          return Response.json({ error: "Invalid mapping JSON" }, { status: 400 });
        }
      }

      const job = await createImportJob(ctx, {
        fileName,
        sourceType,
        templateId: templateId ?? undefined,
        mappingOverride,
        fileContent,
      });

      return Response.json({ job }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("Create import job error:", error);
      return Response.json({ error: message }, { status: 400 });
    }
  })
);

export const handleGetImportJobErrors = withAuth(
  requirePermission(PERMISSIONS.IMPORT_EXECUTE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const jobId = pathParts[pathParts.length - 2];
      const page = parseInt(url.searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") ?? "50", 10);

      if (!jobId) {
        return Response.json({ error: "Job ID required" }, { status: 400 });
      }

      const result = await getImportJobErrors(ctx, jobId, page, pageSize);
      return Response.json(result);
    } catch (error) {
      console.error("Get import job errors error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleListImportTemplates = withAuth(
  requirePermission(PERMISSIONS.IMPORT_EXECUTE, async (req: Request, ctx: TenantContext) => {
    try {
      const templates = await listImportTemplates(ctx);
      return Response.json({ templates });
    } catch (error) {
      console.error("List import templates error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleCreateImportTemplate = withAuth(
  requirePermission(PERMISSIONS.IMPORT_EXECUTE, async (req: Request, ctx: TenantContext) => {
    try {
      const body = await req.json();
      const parsed = createImportTemplateSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const template = await createImportTemplate(ctx, {
        name: parsed.data.name,
        mapping: parsed.data.mapping as ImportTemplateMapping,
      });

      return Response.json({ template }, { status: 201 });
    } catch (error) {
      console.error("Create import template error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleDeleteImportTemplate = withAuth(
  requirePermission(PERMISSIONS.IMPORT_EXECUTE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const templateId = url.pathname.split("/").pop();

      if (!templateId) {
        return Response.json({ error: "Template ID required" }, { status: 400 });
      }

      const success = await deleteImportTemplate(ctx, templateId);
      if (!success) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete import template error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleExportAssets = withAuth(
  requirePermission(PERMISSIONS.EXPORT_READ, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const format = url.searchParams.get("format") ?? "csv";

      if (!exportFormatValues.includes(format)) {
        return Response.json({ error: "Invalid format. Must be csv or xlsx" }, { status: 400 });
      }

      const filters = exportFiltersSchema.parse({
        category: url.searchParams.get("category") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        location: url.searchParams.get("location") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
      });

      const result = await exportAssets(ctx, {
        format: format as ExportFormat,
        filters,
      });

      return new Response(new Uint8Array(result.buffer), {
        headers: {
          "Content-Type": result.mimeType,
          "Content-Disposition": `attachment; filename="${result.filename}"`,
        },
      });
    } catch (error) {
      console.error("Export assets error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);
