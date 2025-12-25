export const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const JOB_TYPES = {
  IMPORT_ASSETS: "import_assets",
  EXPORT_ASSETS: "export_assets",
  WEBHOOK_DELIVER: "webhook_deliver",
  PRINT_DISPATCH: "print_dispatch",
  CLOUD_PRINT_SYNC: "cloud_print_sync",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export interface BackgroundJob {
  id: string;
  tenantId: string;
  type: JobType;
  status: JobStatus;
  priority: number;
  runAfter: Date;
  attempts: number;
  maxAttempts: number;
  lockedAt: Date | null;
  lockedBy: string | null;
  payload: unknown;
  result: unknown | null;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnqueueJobInput {
  type: JobType;
  payload: unknown;
  runAfter?: Date;
  priority?: number;
  maxAttempts?: number;
}

export interface JobFilters {
  type?: JobType;
  status?: JobStatus;
  createdBy?: string;
}

export interface JobListResult {
  jobs: BackgroundJob[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JobWorkerOptions {
  instanceId: string;
  pollMs?: number;
  concurrency?: number;
  types?: JobType[];
}
