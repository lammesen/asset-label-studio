import { eq, and, desc, gte, lte, count, inArray } from "drizzle-orm";

import { db, schema } from "@/db";
import { printJobs, printJobItems, assets, labelTemplates } from "@/db/schema";
import { withTenant } from "@/lib/tenant";
import { createAuditLog } from "@/services/audit-service";
import { renderLabels } from "@/services/label-renderer";

import type { TenantContext } from "@/types/tenant";
import type { LabelSpec } from "@/types/label-spec";
import { labelSpecSchema } from "@/lib/validations";
import type {
  PrintJob,
  PrintJobItem,
  PrintJobStatus,
  PrintOptions,
  PrintJobFilters,
  PrintJobListResult,
  CreatePrintJobInput,
  RenderResult,
  RenderAssetData,
} from "@/types/print";
import { PRINT_JOB_STATUS } from "@/types/print";
import { AUDIT_ACTIONS } from "@/types/audit";

function mapJobRow(row: typeof printJobs.$inferSelect): PrintJob {
  return {
    id: row.id,
    tenantId: row.tenantId,
    templateId: row.templateId,
    templateVersion: row.templateVersion,
    templateName: row.templateName,
    options: row.options as PrintOptions,
    status: row.status as PrintJobStatus,
    itemCount: row.itemCount,
    completedCount: row.completedCount,
    errorMessage: row.errorMessage,
    outputUrl: row.outputUrl,
    outputSize: row.outputSize,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function mapItemRow(row: typeof printJobItems.$inferSelect): PrintJobItem {
  return {
    id: row.id,
    jobId: row.jobId,
    assetId: row.assetId,
    sequence: row.sequence,
    status: row.status as PrintJobStatus,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    processedAt: row.processedAt,
  };
}

function mapAssetToRenderData(asset: typeof assets.$inferSelect): RenderAssetData {
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    serialNumber: asset.serialNumber,
    manufacturer: asset.manufacturer,
    model: asset.model,
    category: asset.category,
    type: asset.type,
    location: asset.location,
    department: asset.department,
    assignedTo: asset.assignedTo,
    status: asset.status,
    purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
    warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : null,
    customFields: (asset.customFields as Record<string, unknown>) ?? {},
  };
}

export async function createPrintJob(
  ctx: TenantContext,
  input: CreatePrintJobInput
): Promise<PrintJob> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [template] = await tx
      .select()
      .from(labelTemplates)
      .where(and(
        eq(labelTemplates.id, input.templateId),
        eq(labelTemplates.tenantId, ctx.tenantId)
      ));

    if (!template) {
      throw new Error("Template not found");
    }

    if (input.assetIds.length === 0) {
      throw new Error("No assets specified");
    }

    const validAssets = await tx
      .select({ id: assets.id })
      .from(assets)
      .where(and(
        eq(assets.tenantId, ctx.tenantId),
        inArray(assets.id, input.assetIds)
      ));

    const validAssetIds = validAssets.map((a) => a.id);

    if (validAssetIds.length === 0) {
      throw new Error("No valid assets found");
    }

    const options: PrintOptions = {
      format: (template.format as PrintOptions["format"]) ?? "custom",
      outputFormat: input.options?.outputFormat ?? "pdf",
      copies: input.options?.copies ?? 1,
      useSheetLayout: input.options?.useSheetLayout ?? false,
      paperSize: input.options?.paperSize ?? "letter",
      dpi: input.options?.dpi ?? 300,
      previewOnly: false,
    };

    const [job] = await tx
      .insert(printJobs)
      .values({
        tenantId: ctx.tenantId,
        templateId: template.id,
        templateVersion: template.version,
        templateName: template.name,
        options,
        status: PRINT_JOB_STATUS.PENDING,
        itemCount: validAssetIds.length,
        completedCount: 0,
        createdBy: ctx.userId,
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create print job");
    }

    const itemValues = validAssetIds.map((assetId, index) => ({
      jobId: job.id,
      assetId,
      sequence: index + 1,
      status: PRINT_JOB_STATUS.PENDING,
    }));

    await tx.insert(printJobItems).values(itemValues);

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.PRINT_JOB_CREATED,
      resourceType: "print_job",
      resourceId: job.id,
      details: {
        templateId: template.id,
        templateName: template.name,
        assetCount: validAssetIds.length,
      },
    });

    return mapJobRow(job);
  });
}

export async function getPrintJob(
  ctx: TenantContext,
  jobId: string
): Promise<PrintJob | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [job] = await tx
      .select()
      .from(printJobs)
      .where(and(
        eq(printJobs.id, jobId),
        eq(printJobs.tenantId, ctx.tenantId)
      ));

    return job ? mapJobRow(job) : null;
  });
}

export async function getPrintJobItems(
  ctx: TenantContext,
  jobId: string
): Promise<PrintJobItem[]> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [job] = await tx
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(and(
        eq(printJobs.id, jobId),
        eq(printJobs.tenantId, ctx.tenantId)
      ));

    if (!job) {
      throw new Error("Print job not found");
    }

    const items = await tx
      .select()
      .from(printJobItems)
      .where(eq(printJobItems.jobId, jobId))
      .orderBy(printJobItems.sequence);

    return items.map(mapItemRow);
  });
}

export async function listPrintJobs(
  ctx: TenantContext,
  filters: PrintJobFilters = {},
  page = 1,
  pageSize = 20
): Promise<PrintJobListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const conditions = [eq(printJobs.tenantId, ctx.tenantId)];

    if (filters.status) {
      conditions.push(eq(printJobs.status, filters.status));
    }
    if (filters.templateId) {
      conditions.push(eq(printJobs.templateId, filters.templateId));
    }
    if (filters.createdBy) {
      conditions.push(eq(printJobs.createdBy, filters.createdBy));
    }
    if (filters.startDate) {
      conditions.push(gte(printJobs.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(printJobs.createdAt, filters.endDate));
    }

    const whereClause = and(...conditions);

    const [countResult] = await tx
      .select({ count: count() })
      .from(printJobs)
      .where(whereClause);

    const jobs = await tx
      .select()
      .from(printJobs)
      .where(whereClause)
      .orderBy(desc(printJobs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      jobs: jobs.map(mapJobRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

export async function renderPrintJob(
  ctx: TenantContext,
  jobId: string
): Promise<RenderResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [job] = await tx
      .select()
      .from(printJobs)
      .where(and(
        eq(printJobs.id, jobId),
        eq(printJobs.tenantId, ctx.tenantId)
      ));

    if (!job) {
      throw new Error("Print job not found");
    }

    const [template] = await tx
      .select()
      .from(labelTemplates)
      .where(and(
        eq(labelTemplates.id, job.templateId),
        eq(labelTemplates.tenantId, ctx.tenantId)
      ));

    if (!template) {
      throw new Error("Template not found");
    }

    await tx
      .update(printJobs)
      .set({
        status: PRINT_JOB_STATUS.PROCESSING,
        startedAt: new Date(),
      })
      .where(eq(printJobs.id, jobId));

    const items = await tx
      .select()
      .from(printJobItems)
      .where(eq(printJobItems.jobId, jobId))
      .orderBy(printJobItems.sequence);

    const assetIds = items.map((item) => item.assetId);

    if (assetIds.length === 0) {
      throw new Error("No assets in print job");
    }
    
    const assetRows = await tx
      .select()
      .from(assets)
      .where(and(
        eq(assets.tenantId, ctx.tenantId),
        inArray(assets.id, assetIds)
      ));

    const assetMap = new Map(assetRows.map((a) => [a.id, a]));
    const orderedAssets: RenderAssetData[] = [];

    for (const assetId of assetIds) {
      const asset = assetMap.get(assetId);
      if (asset) {
        orderedAssets.push(mapAssetToRenderData(asset));
      }
    }

    try {
      const specResult = labelSpecSchema.safeParse(template.spec);
      if (!specResult.success) {
        throw new Error(`Invalid template spec: ${specResult.error.message}`);
      }
      
      const result = await renderLabels({
        spec: specResult.data as LabelSpec,
        assets: orderedAssets,
        options: job.options as PrintOptions,
      });

      const [jobStatusAfterRender] = await tx
        .select({ status: printJobs.status })
        .from(printJobs)
        .where(eq(printJobs.id, jobId));

      const wasCancelledDuringRender = jobStatusAfterRender?.status === PRINT_JOB_STATUS.CANCELLED;
      if (wasCancelledDuringRender) {
        await createAuditLog(ctx, {
          action: AUDIT_ACTIONS.PRINT_JOB_CANCELLED,
          resourceType: "print_job",
          resourceId: jobId,
          details: { cancelledDuringRender: true },
        });
        throw new Error("Print job was cancelled during rendering");
      }

      await tx
        .update(printJobs)
        .set({
          status: PRINT_JOB_STATUS.COMPLETED,
          completedCount: orderedAssets.length,
          outputSize: result.buffer.length,
          completedAt: new Date(),
        })
        .where(eq(printJobs.id, jobId));

      await tx
        .update(printJobItems)
        .set({
          status: PRINT_JOB_STATUS.COMPLETED,
          processedAt: new Date(),
        })
        .where(eq(printJobItems.jobId, jobId));

      await createAuditLog(ctx, {
        action: AUDIT_ACTIONS.PRINT_JOB_RENDERED,
        resourceType: "print_job",
        resourceId: jobId,
        details: {
          pageCount: result.pageCount,
          assetCount: orderedAssets.length,
          fileSize: result.buffer.length,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await tx
        .update(printJobs)
        .set({
          status: PRINT_JOB_STATUS.FAILED,
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(printJobs.id, jobId));

      await createAuditLog(ctx, {
        action: AUDIT_ACTIONS.PRINT_JOB_FAILED,
        severity: "error",
        resourceType: "print_job",
        resourceId: jobId,
        details: { error: errorMessage },
      });

      throw error;
    }
  });
}

export async function cancelPrintJob(
  ctx: TenantContext,
  jobId: string
): Promise<PrintJob | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [job] = await tx
      .select()
      .from(printJobs)
      .where(and(
        eq(printJobs.id, jobId),
        eq(printJobs.tenantId, ctx.tenantId)
      ));

    if (!job) {
      return null;
    }

    if (job.status === PRINT_JOB_STATUS.COMPLETED || job.status === PRINT_JOB_STATUS.FAILED) {
      throw new Error("Cannot cancel completed or failed job");
    }

    const [updated] = await tx
      .update(printJobs)
      .set({
        status: PRINT_JOB_STATUS.CANCELLED,
        completedAt: new Date(),
      })
      .where(eq(printJobs.id, jobId))
      .returning();

    await tx
      .update(printJobItems)
      .set({
        status: PRINT_JOB_STATUS.CANCELLED,
        processedAt: new Date(),
      })
      .where(and(
        eq(printJobItems.jobId, jobId),
        eq(printJobItems.status, PRINT_JOB_STATUS.PENDING)
      ));

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.PRINT_JOB_CANCELLED,
      resourceType: "print_job",
      resourceId: jobId,
    });

    return updated ? mapJobRow(updated) : null;
  });
}

export async function renderPreview(
  ctx: TenantContext,
  templateId: string,
  assetId: string
): Promise<RenderResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [template] = await tx
      .select()
      .from(labelTemplates)
      .where(and(
        eq(labelTemplates.id, templateId),
        eq(labelTemplates.tenantId, ctx.tenantId)
      ));

    if (!template) {
      throw new Error("Template not found");
    }

    const [asset] = await tx
      .select()
      .from(assets)
      .where(and(
        eq(assets.id, assetId),
        eq(assets.tenantId, ctx.tenantId)
      ));

    if (!asset) {
      throw new Error("Asset not found");
    }

    const specResult = labelSpecSchema.safeParse(template.spec);
    if (!specResult.success) {
      throw new Error(`Invalid template spec: ${specResult.error.message}`);
    }

    return renderLabels({
      spec: specResult.data as LabelSpec,
      assets: [mapAssetToRenderData(asset)],
      options: {
        format: template.format as PrintOptions["format"],
        outputFormat: "pdf",
        copies: 1,
        useSheetLayout: false,
        dpi: 150,
        previewOnly: true,
      },
    });
  });
}
