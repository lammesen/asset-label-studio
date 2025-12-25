import { eq, and, desc, count } from "drizzle-orm";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

import { db } from "@/db";
import { importTemplates, importJobs, importJobErrors, assets } from "@/db/schema";
import { withTenant } from "@/lib/tenant";
import { createAuditLog } from "@/services/audit-service";
import { enqueueJob } from "@/services/job-service";

import type { TenantContext } from "@/types/tenant";
import type {
  ImportTemplate,
  ImportJob,
  ImportJobError,
  ImportTemplateMapping,
  CreateImportJobInput,
  CreateImportTemplateInput,
  ImportJobListResult,
  ImportJobErrorsResult,
  ImportJobStatus,
  ImportColumnMapping,
  ImportTransform,
  AssetFieldPath,
} from "@/types/import-export";
import { IMPORT_JOB_STATUS, IMPORT_SOURCE_TYPES } from "@/types/import-export";
import { JOB_TYPES } from "@/types/background-job";
import { AUDIT_ACTIONS } from "@/types/audit";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 10000;

function mapTemplateRow(row: typeof importTemplates.$inferSelect): ImportTemplate {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    entity: row.entity,
    mapping: row.mapping as ImportTemplateMapping,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function mapJobRow(row: typeof importJobs.$inferSelect): ImportJob {
  return {
    id: row.id,
    tenantId: row.tenantId,
    createdBy: row.createdBy,
    status: row.status as ImportJobStatus,
    sourceType: row.sourceType as "csv" | "xlsx",
    fileName: row.fileName,
    templateId: row.templateId,
    totalRows: row.totalRows,
    processedRows: row.processedRows,
    successRows: row.successRows,
    errorRows: row.errorRows,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    summary: row.summary as ImportJob["summary"],
  };
}

function mapErrorRow(row: typeof importJobErrors.$inferSelect): ImportJobError {
  return {
    id: row.id,
    tenantId: row.tenantId,
    jobId: row.jobId,
    rowNumber: row.rowNumber,
    field: row.field,
    message: row.message,
    raw: row.raw,
    createdAt: row.createdAt,
  };
}

export async function createImportTemplate(
  ctx: TenantContext,
  input: CreateImportTemplateInput
): Promise<ImportTemplate> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .insert(importTemplates)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        entity: input.entity ?? "asset",
        mapping: input.mapping,
        createdBy: ctx.userId,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create import template");
    }

    return mapTemplateRow(row);
  });
}

export async function listImportTemplates(
  ctx: TenantContext
): Promise<ImportTemplate[]> {
  return withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(importTemplates)
      .where(eq(importTemplates.tenantId, ctx.tenantId))
      .orderBy(desc(importTemplates.createdAt));

    return rows.map(mapTemplateRow);
  });
}

export async function deleteImportTemplate(
  ctx: TenantContext,
  templateId: string
): Promise<boolean> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .delete(importTemplates)
      .where(and(
        eq(importTemplates.id, templateId),
        eq(importTemplates.tenantId, ctx.tenantId)
      ))
      .returning({ id: importTemplates.id });

    return !!row;
  });
}

export async function createImportJob(
  ctx: TenantContext,
  input: CreateImportJobInput
): Promise<ImportJob> {
  if (input.fileContent.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .insert(importJobs)
      .values({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        status: IMPORT_JOB_STATUS.QUEUED,
        sourceType: input.sourceType,
        fileName: input.fileName,
        templateId: input.templateId,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create import job");
    }

    await enqueueJob(ctx, {
      type: JOB_TYPES.IMPORT_ASSETS,
      payload: {
        jobId: row.id,
        tenantId: ctx.tenantId,
        fileContent: input.fileContent.toString("base64"),
        sourceType: input.sourceType,
        templateId: input.templateId,
        mappingOverride: input.mappingOverride,
      },
      priority: 5,
    });

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.IMPORT_STARTED,
      resourceType: "import_job",
      resourceId: row.id,
      details: { fileName: input.fileName, sourceType: input.sourceType },
    });

    return mapJobRow(row);
  });
}

export async function getImportJob(
  ctx: TenantContext,
  jobId: string
): Promise<ImportJob | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(importJobs)
      .where(and(
        eq(importJobs.id, jobId),
        eq(importJobs.tenantId, ctx.tenantId)
      ));

    return row ? mapJobRow(row) : null;
  });
}

export async function listImportJobs(
  ctx: TenantContext,
  page = 1,
  pageSize = 20
): Promise<ImportJobListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(importJobs)
      .where(eq(importJobs.tenantId, ctx.tenantId));

    const rows = await tx
      .select()
      .from(importJobs)
      .where(eq(importJobs.tenantId, ctx.tenantId))
      .orderBy(desc(importJobs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      jobs: rows.map(mapJobRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

export async function getImportJobErrors(
  ctx: TenantContext,
  jobId: string,
  page = 1,
  pageSize = 50
): Promise<ImportJobErrorsResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [job] = await tx
      .select({ id: importJobs.id })
      .from(importJobs)
      .where(and(
        eq(importJobs.id, jobId),
        eq(importJobs.tenantId, ctx.tenantId)
      ));

    if (!job) {
      throw new Error("Import job not found");
    }

    const [countResult] = await tx
      .select({ count: count() })
      .from(importJobErrors)
      .where(eq(importJobErrors.jobId, jobId));

    const rows = await tx
      .select()
      .from(importJobErrors)
      .where(eq(importJobErrors.jobId, jobId))
      .orderBy(importJobErrors.rowNumber)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      errors: rows.map(mapErrorRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

function parseCSV(content: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0]?.message}`);
  }

  return result.data;
}

function parseXLSX(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error("No sheets found in Excel file");
  }

  const worksheet = workbook.Sheets[firstSheet];
  if (!worksheet) {
    throw new Error("Failed to read worksheet");
  }

  return XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
    defval: "",
    raw: false,
  });
}

function parseDate(value: string, format?: string): string {
  if (!value) return "";
  
  const trimmed = value.trim();
  
  if (format === "ISO") {
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? "" : parsed.toISOString().split("T")[0]!;
  }
  
  if (format === "US") {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    }
  }
  
  if (format === "EU") {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    }
  }
  
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0]!;
  }
  
  return "";
}

function applyTransforms(value: string, transforms: ImportTransform[]): string {
  let result = value;

  for (const transform of transforms) {
    switch (transform.kind) {
      case "trim":
        result = result.trim();
        break;
      case "upper":
        result = result.toUpperCase();
        break;
      case "lower":
        result = result.toLowerCase();
        break;
      case "default":
        if (!result) result = transform.value;
        break;
      case "date":
        result = parseDate(result, transform.format);
        break;
    }
  }

  return result;
}

function mapRowToAsset(
  row: Record<string, string>,
  mapping: ImportTemplateMapping,
  rowNumber: number
): { data: Record<string, unknown>; errors: Array<{ field: string; message: string }> } {
  const data: Record<string, unknown> = {};
  const errors: Array<{ field: string; message: string }> = [];

  if (mapping.defaults) {
    for (const [key, value] of Object.entries(mapping.defaults)) {
      setNestedValue(data, key, value);
    }
  }

  for (const col of mapping.columns) {
    let value = row[col.column] ?? "";
    
    if (col.transforms) {
      value = applyTransforms(value, col.transforms);
    }

    if (col.required && !value) {
      errors.push({ field: col.to, message: `Required field "${col.column}" is missing` });
      continue;
    }

    if (value) {
      setNestedValue(data, col.to, value);
    }
  }

  return { data, errors };
}

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const ALLOWED_ASSET_FIELDS = new Set([
  "category",
  "type",
  "assetTag",
  "serialNumber",
  "manufacturer",
  "model",
  "location",
  "department",
  "assignedTo",
  "status",
  "purchaseDate",
  "warrantyExpiry",
  "retiredDate",
  "notes",
  "customFields",
]);

function isValidFieldPath(path: string): boolean {
  const parts = path.split(".");
  if (parts.length === 0 || parts.some(part => part.length === 0)) {
    return false;
  }
  
  if (parts.some(part => FORBIDDEN_KEYS.has(part))) {
    return false;
  }
  
  const rootField = parts[0];
  if (!rootField || !ALLOWED_ASSET_FIELDS.has(rootField)) {
    return false;
  }
  
  if (rootField !== "customFields" && parts.length > 1) {
    return false;
  }
  
  return true;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (!isValidFieldPath(path)) {
    throw new Error(`Invalid field path: ${path}`);
  }

  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    current[lastPart] = value;
  }
}

export async function processImportJob(
  jobId: string,
  tenantId: string,
  fileContent: string,
  sourceType: "csv" | "xlsx",
  templateId?: string,
  mappingOverride?: ImportTemplateMapping
): Promise<void> {
  const startTime = Date.now();

  await withTenant(tenantId, async (tx) => {
    await tx
      .update(importJobs)
      .set({
        status: IMPORT_JOB_STATUS.PROCESSING,
        startedAt: new Date(),
      })
      .where(eq(importJobs.id, jobId));
  });

  try {
    const { mapping, createdBy } = await withTenant(tenantId, async (tx) => {
      const [job] = await tx
        .select({ createdBy: importJobs.createdBy })
        .from(importJobs)
        .where(eq(importJobs.id, jobId));

      if (!job) {
        throw new Error("Import job not found");
      }

      let resolvedMapping: ImportTemplateMapping;

      if (mappingOverride) {
        resolvedMapping = mappingOverride;
      } else if (templateId) {
        const [template] = await tx
          .select()
          .from(importTemplates)
          .where(and(
            eq(importTemplates.id, templateId),
            eq(importTemplates.tenantId, tenantId)
          ));

        if (!template) {
          throw new Error("Import template not found");
        }
        resolvedMapping = template.mapping as ImportTemplateMapping;
      } else {
        throw new Error("No mapping provided");
      }

      return { mapping: resolvedMapping, createdBy: job.createdBy };
    });

    const buffer = Buffer.from(fileContent, "base64");
    let rows: Record<string, string>[];

    if (sourceType === IMPORT_SOURCE_TYPES.CSV) {
      rows = parseCSV(buffer.toString("utf-8"));
    } else {
      rows = parseXLSX(buffer);
    }

    if (rows.length > MAX_ROWS) {
      throw new Error(`Too many rows. Maximum is ${MAX_ROWS}`);
    }

    await withTenant(tenantId, async (tx) => {
      await tx
        .update(importJobs)
        .set({ totalRows: rows.length })
        .where(eq(importJobs.id, jobId));
    });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const rowNumber = i + 2;
      const { data, errors } = mapRowToAsset(row, mapping, rowNumber);

      if (errors.length > 0) {
        await withTenant(tenantId, async (tx) => {
          for (const error of errors) {
            await tx.insert(importJobErrors).values({
              tenantId,
              jobId,
              rowNumber,
              field: error.field,
              message: error.message,
              raw: row,
            });
          }
        });
        errorCount++;
      } else {
        try {
          await withTenant(tenantId, async (tx) => {
            await tx.insert(assets).values({
              tenantId,
              category: (data.category as string) || "networking",
              type: (data.type as string) || "other",
              assetTag: (data.assetTag as string) || `ASSET-${Date.now()}-${i}`,
              serialNumber: (data.serialNumber as string) || "",
              manufacturer: (data.manufacturer as string) || "",
              model: (data.model as string) || "",
              location: (data.location as string) || "",
              department: (data.department as string) || null,
              assignedTo: (data.assignedTo as string) || null,
              status: (data.status as string) || "active",
              purchaseDate: data.purchaseDate ? String(data.purchaseDate) : null,
              warrantyExpiry: data.warrantyExpiry ? String(data.warrantyExpiry) : null,
              notes: (data.notes as string) || null,
              customFields: (data.customFields as Record<string, unknown>) || {},
              createdBy,
            });
          });
          successCount++;
        } catch (insertError) {
          await withTenant(tenantId, async (tx) => {
            await tx.insert(importJobErrors).values({
              tenantId,
              jobId,
              rowNumber,
              message: insertError instanceof Error ? insertError.message : "Insert failed",
              raw: row,
            });
          });
          errorCount++;
        }
      }

      if (i % 100 === 0) {
        await withTenant(tenantId, async (tx) => {
          await tx
            .update(importJobs)
            .set({
              processedRows: i + 1,
              successRows: successCount,
              errorRows: errorCount,
            })
            .where(eq(importJobs.id, jobId));
        });
      }
    }

    const duration = Date.now() - startTime;

    await withTenant(tenantId, async (tx) => {
      await tx
        .update(importJobs)
        .set({
          status: IMPORT_JOB_STATUS.COMPLETED,
          processedRows: rows.length,
          successRows: successCount,
          errorRows: errorCount,
          completedAt: new Date(),
          summary: { duration },
        })
        .where(eq(importJobs.id, jobId));
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await withTenant(tenantId, async (tx) => {
      await tx
        .update(importJobs)
        .set({
          status: IMPORT_JOB_STATUS.FAILED,
          completedAt: new Date(),
          summary: { errors: [errorMessage] },
        })
        .where(eq(importJobs.id, jobId));
    });

    throw error;
  }
}
