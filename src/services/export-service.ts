import { eq, and, ilike, desc } from "drizzle-orm";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

import { db } from "@/db";
import { assets, exportJobs } from "@/db/schema";
import { withTenant } from "@/lib/tenant";
import { createAuditLog } from "@/services/audit-service";

import type { TenantContext } from "@/types/tenant";
import type {
  ExportJob,
  ExportFilters,
  CreateExportJobInput,
  ExportResult,
  ExportFormat,
  ImportJobStatus,
} from "@/types/import-export";
import { IMPORT_JOB_STATUS, EXPORT_FORMATS } from "@/types/import-export";
import { AUDIT_ACTIONS } from "@/types/audit";

const MAX_EXPORT_ROWS = 50000;

const FORMULA_INJECTION_CHARS = new Set(["=", "+", "-", "@", "\t", "\r", "\n"]);

function sanitizeForSpreadsheet(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  const str = String(value);
  if (str.length === 0) {
    return "";
  }
  
  const firstChar = str.charAt(0);
  if (FORMULA_INJECTION_CHARS.has(firstChar)) {
    return `'${str}`;
  }
  
  return str;
}

function sanitizeExportRow(row: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeForSpreadsheet(value);
  }
  return sanitized;
}

function mapJobRow(row: typeof exportJobs.$inferSelect): ExportJob {
  return {
    id: row.id,
    tenantId: row.tenantId,
    createdBy: row.createdBy,
    status: row.status as ImportJobStatus,
    entity: row.entity,
    format: row.format as ExportFormat,
    filters: row.filters as ExportFilters,
    totalRows: row.totalRows,
    outputMime: row.outputMime,
    outputBytes: row.outputBytes,
    outputStorageKey: row.outputStorageKey,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export async function exportAssets(
  ctx: TenantContext,
  input: CreateExportJobInput
): Promise<ExportResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const conditions = [eq(assets.tenantId, ctx.tenantId)];

    if (input.filters?.category) {
      conditions.push(eq(assets.category, input.filters.category));
    }
    if (input.filters?.status) {
      conditions.push(eq(assets.status, input.filters.status));
    }
    if (input.filters?.location) {
      conditions.push(ilike(assets.location, `%${input.filters.location}%`));
    }
    if (input.filters?.search) {
      const search = `%${input.filters.search}%`;
      conditions.push(
        ilike(assets.assetTag, search)
      );
    }

    const rows = await tx
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.createdAt))
      .limit(MAX_EXPORT_ROWS);

    const data = rows.map((row) => sanitizeExportRow({
      "Asset Tag": row.assetTag,
      "Serial Number": row.serialNumber,
      "Category": row.category,
      "Type": row.type,
      "Manufacturer": row.manufacturer,
      "Model": row.model,
      "Location": row.location,
      "Department": row.department ?? "",
      "Assigned To": row.assignedTo ?? "",
      "Status": row.status,
      "Purchase Date": row.purchaseDate ?? "",
      "Warranty Expiry": row.warrantyExpiry ?? "",
      "Notes": row.notes ?? "",
      "Created At": row.createdAt.toISOString(),
    }));

    let buffer: Buffer;
    let mimeType: string;
    let filename: string;

    if (input.format === EXPORT_FORMATS.CSV) {
      const csv = Papa.unparse(data);
      buffer = Buffer.from(csv, "utf-8");
      mimeType = "text/csv";
      filename = `assets-export-${Date.now()}.csv`;
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
      buffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `assets-export-${Date.now()}.xlsx`;
    }

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.EXPORT_EXECUTED,
      resourceType: "asset",
      details: {
        format: input.format,
        filters: input.filters,
        rowCount: data.length,
      },
    });

    return { buffer, filename, mimeType };
  });
}

export async function createExportJob(
  ctx: TenantContext,
  input: CreateExportJobInput
): Promise<ExportJob> {
  return withTenant(ctx.tenantId, async (tx) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [row] = await tx
      .insert(exportJobs)
      .values({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        status: IMPORT_JOB_STATUS.QUEUED,
        entity: input.entity ?? "asset",
        format: input.format,
        filters: input.filters ?? {},
        expiresAt,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create export job");
    }

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.EXPORT_CREATED,
      resourceType: "export_job",
      resourceId: row.id,
      details: { format: input.format, filters: input.filters },
    });

    return mapJobRow(row);
  });
}

export async function getExportJob(
  ctx: TenantContext,
  jobId: string
): Promise<ExportJob | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(exportJobs)
      .where(and(
        eq(exportJobs.id, jobId),
        eq(exportJobs.tenantId, ctx.tenantId)
      ));

    return row ? mapJobRow(row) : null;
  });
}
