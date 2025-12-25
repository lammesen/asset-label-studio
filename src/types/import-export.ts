export const IMPORT_SOURCE_TYPES = {
  CSV: "csv",
  XLSX: "xlsx",
} as const;

export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[keyof typeof IMPORT_SOURCE_TYPES];

export const IMPORT_JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUS)[keyof typeof IMPORT_JOB_STATUS];

export const EXPORT_FORMATS = {
  CSV: "csv",
  XLSX: "xlsx",
} as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[keyof typeof EXPORT_FORMATS];

export type AssetFieldPath =
  | "assetTag"
  | "serialNumber"
  | "manufacturer"
  | "model"
  | "location"
  | "department"
  | "assignedTo"
  | "status"
  | "category"
  | "type"
  | "purchaseDate"
  | "warrantyExpiry"
  | "notes"
  | `customFields.${string}`;

export type ImportTransform =
  | { kind: "trim" }
  | { kind: "upper" }
  | { kind: "lower" }
  | { kind: "date"; format?: string }
  | { kind: "default"; value: string };

export interface ImportColumnMapping {
  column: string;
  to: AssetFieldPath;
  required?: boolean;
  transforms?: ImportTransform[];
}

export interface ImportTemplateMapping {
  entity: "asset";
  columns: ImportColumnMapping[];
  defaults?: Partial<Record<AssetFieldPath, unknown>>;
}

export interface ImportTemplate {
  id: string;
  tenantId: string;
  name: string;
  entity: string;
  mapping: ImportTemplateMapping;
  createdBy: string;
  createdAt: Date;
}

export interface ImportJob {
  id: string;
  tenantId: string;
  createdBy: string;
  status: ImportJobStatus;
  sourceType: ImportSourceType;
  fileName: string;
  templateId: string | null;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  summary: ImportJobSummary;
}

export interface ImportJobSummary {
  duration?: number;
  errors?: string[];
}

export interface ImportJobError {
  id: string;
  tenantId: string;
  jobId: string;
  rowNumber: number;
  field: string | null;
  message: string;
  raw: unknown;
  createdAt: Date;
}

export interface CreateImportJobInput {
  fileName: string;
  sourceType: ImportSourceType;
  templateId?: string;
  mappingOverride?: ImportTemplateMapping;
  fileContent: Buffer;
}

export interface ImportJobListResult {
  jobs: ImportJob[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ImportJobErrorsResult {
  errors: ImportJobError[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateImportTemplateInput {
  name: string;
  entity?: "asset";
  mapping: ImportTemplateMapping;
}

export interface ExportJob {
  id: string;
  tenantId: string;
  createdBy: string;
  status: ImportJobStatus;
  entity: string;
  format: ExportFormat;
  filters: ExportFilters;
  totalRows: number;
  outputMime: string | null;
  outputBytes: number | null;
  outputStorageKey: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ExportFilters {
  category?: string;
  status?: string;
  search?: string;
  location?: string;
}

export interface CreateExportJobInput {
  entity?: "asset";
  format: ExportFormat;
  filters?: ExportFilters;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}
