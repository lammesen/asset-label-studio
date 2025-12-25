import { z } from "zod";

import { withAuth } from "@/api/middleware/auth";
import { requirePermission } from "@/api/middleware/permissions";
import { PERMISSIONS } from "@/types/permissions";
import {
  createPrintJob,
  getPrintJob,
  getPrintJobItems,
  listPrintJobs,
  renderPrintJob,
  cancelPrintJob,
  renderPreview,
} from "@/services/print-service";
import { PRINT_JOB_STATUS, PRINT_OUTPUT_FORMAT } from "@/types/print";
import type { PrintJobStatus, PrintOutputFormat } from "@/types/print";
import { LABEL_FORMATS } from "@/types/label-spec";
import type { LabelFormatId } from "@/types/label-spec";

const labelFormatValues = Object.keys(LABEL_FORMATS) as [string, ...string[]];
const printStatusValues = Object.values(PRINT_JOB_STATUS) as [string, ...string[]];
const outputFormatValues = Object.values(PRINT_OUTPUT_FORMAT) as [string, ...string[]];

const createPrintJobSchema = z.object({
  templateId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1).max(1000),
  options: z.object({
    format: z.enum(labelFormatValues).optional(),
    outputFormat: z.enum(outputFormatValues).optional(),
    copies: z.number().int().min(1).max(100).optional(),
    useSheetLayout: z.boolean().optional(),
    paperSize: z.string().optional(),
    dpi: z.number().int().min(72).max(600).optional(),
  }).optional(),
});

const printJobFiltersSchema = z.object({
  status: z.enum(printStatusValues).optional(),
  templateId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const previewSchema = z.object({
  templateId: z.string().uuid(),
  assetId: z.string().uuid(),
});

export const handleListPrintJobs = withAuth(
  requirePermission(PERMISSIONS.PRINT_EXECUTE, async (req, ctx) => {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);

    const parseResult = printJobFiltersSchema.safeParse(params);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid filters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, pageSize, startDate, endDate, status, templateId, createdBy } = parseResult.data;
    const result = await listPrintJobs(
      ctx,
      {
        status: status as PrintJobStatus | undefined,
        templateId,
        createdBy,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      page,
      pageSize
    );

    return Response.json(result);
  })
);

export const handleCreatePrintJob = withAuth(
  requirePermission(PERMISSIONS.PRINT_EXECUTE, async (req, ctx) => {
    const body = await req.json();

    const parseResult = createPrintJobSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const { templateId, assetIds, options } = parseResult.data;
      const job = await createPrintJob(ctx, {
        templateId,
        assetIds,
        options: options ? {
          format: options.format as LabelFormatId | undefined,
          outputFormat: options.outputFormat as PrintOutputFormat | undefined,
          copies: options.copies,
          useSheetLayout: options.useSheetLayout,
          paperSize: options.paperSize,
          dpi: options.dpi,
        } : undefined,
      });
      return Response.json({ job }, { status: 201 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Template not found" || error.message === "No valid assets found") {
          return Response.json({ error: error.message }, { status: 400 });
        }
      }
      throw error;
    }
  })
);

export function handleGetPrintJob(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.PRINT_EXECUTE, async (_req, ctx) => {
      const job = await getPrintJob(ctx, id);
      if (!job) {
        return Response.json({ error: "Print job not found" }, { status: 404 });
      }

      return Response.json({ job });
    })
  )(req);
}

export function handleGetPrintJobItems(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.PRINT_EXECUTE, async (_req, ctx) => {
      try {
        const items = await getPrintJobItems(ctx, id);
        return Response.json({ items });
      } catch (error) {
        if (error instanceof Error && error.message === "Print job not found") {
          return Response.json({ error: error.message }, { status: 404 });
        }
        throw error;
      }
    })
  )(req);
}

export function handleRenderPrintJob(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.PRINT_EXECUTE, async (_req, ctx) => {
      try {
        const result = await renderPrintJob(ctx, id);

        return new Response(new Uint8Array(result.buffer), {
          status: 200,
          headers: {
            "Content-Type": result.mimeType,
            "Content-Disposition": `attachment; filename="${result.filename}"`,
            "Content-Length": String(result.buffer.length),
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Print job not found" || error.message === "Template not found") {
            return Response.json({ error: error.message }, { status: 404 });
          }
        }
        throw error;
      }
    })
  )(req);
}

export function handleCancelPrintJob(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.PRINT_EXECUTE, async (_req, ctx) => {
      try {
        const job = await cancelPrintJob(ctx, id);
        if (!job) {
          return Response.json({ error: "Print job not found" }, { status: 404 });
        }

        return Response.json({ job });
      } catch (error) {
        if (error instanceof Error && error.message.includes("Cannot cancel")) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    })
  )(req);
}

export const handlePreview = withAuth(
  requirePermission(PERMISSIONS.PRINT_EXECUTE, async (req, ctx) => {
    const body = await req.json();

    const parseResult = previewSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const result = await renderPreview(ctx, parseResult.data.templateId, parseResult.data.assetId);

      return new Response(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          "Content-Type": result.mimeType,
          "Content-Disposition": `inline; filename="preview.pdf"`,
          "Content-Length": String(result.buffer.length),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Template not found" || error.message === "Asset not found") {
          return Response.json({ error: error.message }, { status: 404 });
        }
      }
      throw error;
    }
  })
);
