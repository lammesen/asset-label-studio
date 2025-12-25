import type { LabelFormatId, LabelSpec } from "./label-spec";

/**
 * Print job status values
 */
export const PRINT_JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type PrintJobStatus = (typeof PRINT_JOB_STATUS)[keyof typeof PRINT_JOB_STATUS];

/**
 * Print output format
 */
export const PRINT_OUTPUT_FORMAT = {
  PDF: "pdf",
  PNG: "png",
} as const;

export type PrintOutputFormat = (typeof PRINT_OUTPUT_FORMAT)[keyof typeof PRINT_OUTPUT_FORMAT];

/**
 * Paper size for multi-label sheets (e.g., Avery)
 */
export interface PaperSize {
  width: number;
  height: number;
  unit: "mm" | "in";
}

/**
 * Standard paper sizes
 */
export const PAPER_SIZES: Record<string, PaperSize> = {
  letter: { width: 215.9, height: 279.4, unit: "mm" },
  a4: { width: 210, height: 297, unit: "mm" },
  a5: { width: 148, height: 210, unit: "mm" },
} as const;

/**
 * Sheet layout configuration for multi-label sheets
 */
export interface SheetLayout {
  paperSize: PaperSize;
  labelsPerSheet: number;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  horizontalGap: number;
  verticalGap: number;
}

/**
 * Print options for rendering
 */
export interface PrintOptions {
  format: LabelFormatId;
  outputFormat: PrintOutputFormat;
  copies: number;
  
  // Sheet layout options (for multi-label sheets like Avery)
  useSheetLayout: boolean;
  paperSize?: string; // "letter" | "a4" | custom
  
  // Quality settings
  dpi: number;
  
  // Preview mode (don't create job, just render)
  previewOnly?: boolean;
}

/**
 * Default print options
 */
export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  format: "custom",
  outputFormat: "pdf",
  copies: 1,
  useSheetLayout: false,
  paperSize: "letter",
  dpi: 300,
  previewOnly: false,
};

/**
 * Print job - represents a batch print request
 */
export interface PrintJob {
  id: string;
  tenantId: string;
  
  // Template reference
  templateId: string;
  templateVersion: number;
  templateName: string;
  
  // Job configuration
  options: PrintOptions;
  
  // Status tracking
  status: PrintJobStatus;
  itemCount: number;
  completedCount: number;
  
  // Error handling
  errorMessage: string | null;
  
  // Output
  outputUrl: string | null;
  outputSize: number | null; // bytes
  
  // Audit
  createdBy: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Print job item - individual asset in a print job
 */
export interface PrintJobItem {
  id: string;
  jobId: string;
  assetId: string;
  
  // Order in the batch
  sequence: number;
  
  // Status
  status: PrintJobStatus;
  errorMessage: string | null;
  
  // Timestamps
  createdAt: Date;
  processedAt: Date | null;
}

/**
 * Create print job input
 */
export interface CreatePrintJobInput {
  templateId: string;
  assetIds: string[];
  options?: Partial<PrintOptions>;
}

/**
 * Print job filters
 */
export interface PrintJobFilters {
  status?: PrintJobStatus;
  templateId?: string;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Print job list result
 */
export interface PrintJobListResult {
  jobs: PrintJob[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Render result from label renderer
 */
export interface RenderResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  pageCount: number;
}

/**
 * Render request for the label renderer
 */
export interface RenderRequest {
  spec: LabelSpec;
  assets: RenderAssetData[];
  options: PrintOptions;
}

/**
 * Asset data prepared for rendering
 */
export interface RenderAssetData {
  id: string;
  assetTag: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  category: string;
  type: string;
  location: string;
  department: string | null;
  assignedTo: string | null;
  status: string;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  customFields: Record<string, unknown>;
  [key: string]: unknown;
}
