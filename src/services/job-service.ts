import { eq, and, desc, count, sql, lte, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { backgroundJobs } from "@/db/schema";
import { withTenant } from "@/lib/tenant";

import type { TenantContext } from "@/types/tenant";
import type {
  BackgroundJob,
  EnqueueJobInput,
  JobFilters,
  JobListResult,
  JobStatus,
  JobType,
} from "@/types/background-job";
import { JOB_STATUS } from "@/types/background-job";

function mapJobRow(row: typeof backgroundJobs.$inferSelect): BackgroundJob {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type as JobType,
    status: row.status as JobStatus,
    priority: row.priority,
    runAfter: row.runAfter,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lockedAt: row.lockedAt,
    lockedBy: row.lockedBy,
    payload: row.payload,
    result: row.result,
    errorMessage: row.errorMessage,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function enqueueJob(
  ctx: TenantContext,
  input: EnqueueJobInput
): Promise<BackgroundJob> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .insert(backgroundJobs)
      .values({
        tenantId: ctx.tenantId,
        type: input.type,
        payload: input.payload,
        runAfter: input.runAfter ?? new Date(),
        priority: input.priority ?? 0,
        maxAttempts: input.maxAttempts ?? 5,
        createdBy: ctx.userId,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to enqueue job");
    }

    return mapJobRow(row);
  });
}

export async function getJob(
  ctx: TenantContext,
  jobId: string
): Promise<BackgroundJob | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(backgroundJobs)
      .where(and(
        eq(backgroundJobs.id, jobId),
        eq(backgroundJobs.tenantId, ctx.tenantId)
      ));

    return row ? mapJobRow(row) : null;
  });
}

export async function listJobs(
  ctx: TenantContext,
  filters: JobFilters = {},
  page = 1,
  pageSize = 20
): Promise<JobListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const conditions = [eq(backgroundJobs.tenantId, ctx.tenantId)];

    if (filters.type) {
      conditions.push(eq(backgroundJobs.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(backgroundJobs.status, filters.status));
    }
    if (filters.createdBy) {
      conditions.push(eq(backgroundJobs.createdBy, filters.createdBy));
    }

    const whereClause = and(...conditions);

    const [countResult] = await tx
      .select({ count: count() })
      .from(backgroundJobs)
      .where(whereClause);

    const rows = await tx
      .select()
      .from(backgroundJobs)
      .where(whereClause)
      .orderBy(desc(backgroundJobs.createdAt))
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

export async function cancelJob(
  ctx: TenantContext,
  jobId: string
): Promise<boolean> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .update(backgroundJobs)
      .set({
        status: JOB_STATUS.CANCELLED,
        updatedAt: new Date(),
      })
      .where(and(
        eq(backgroundJobs.id, jobId),
        eq(backgroundJobs.tenantId, ctx.tenantId),
        or(
          eq(backgroundJobs.status, JOB_STATUS.QUEUED),
          eq(backgroundJobs.status, JOB_STATUS.PROCESSING)
        )
      ))
      .returning({ id: backgroundJobs.id });

    return !!row;
  });
}

export async function acquireJob(
  tenantId: string,
  instanceId: string,
  types?: JobType[]
): Promise<BackgroundJob | null> {
  return withTenant(tenantId, async (tx) => {
    const typesFilter = types && types.length > 0
      ? sql`AND type = ANY(${types})`
      : sql``;

    const result = await tx.execute(sql`
      WITH next_job AS (
        SELECT id FROM background_jobs
        WHERE tenant_id = ${tenantId}
          AND status = 'queued'
          AND run_after <= NOW()
          AND attempts < max_attempts
          ${typesFilter}
        ORDER BY priority DESC, run_after ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE background_jobs j
      SET 
        status = 'processing',
        locked_at = NOW(),
        locked_by = ${instanceId},
        attempts = j.attempts + 1,
        updated_at = NOW()
      FROM next_job
      WHERE j.id = next_job.id
      RETURNING j.*;
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      type: row.type as JobType,
      status: row.status as JobStatus,
      priority: row.priority as number,
      runAfter: new Date(row.run_after as string),
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      lockedAt: row.locked_at ? new Date(row.locked_at as string) : null,
      lockedBy: row.locked_by as string | null,
      payload: row.payload,
      result: row.result,
      errorMessage: row.error_message as string | null,
      createdBy: row.created_by as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  });
}

export async function completeJob(
  jobId: string,
  tenantId: string,
  instanceId: string,
  result: unknown
): Promise<boolean> {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .update(backgroundJobs)
      .set({
        status: JOB_STATUS.SUCCEEDED,
        result,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(backgroundJobs.id, jobId),
        eq(backgroundJobs.tenantId, tenantId),
        eq(backgroundJobs.lockedBy, instanceId),
        eq(backgroundJobs.status, JOB_STATUS.PROCESSING)
      ))
      .returning({ id: backgroundJobs.id });

    return !!row;
  });
}

export async function failJob(
  jobId: string,
  tenantId: string,
  instanceId: string,
  errorMessage: string,
  retry = true
): Promise<boolean> {
  return withTenant(tenantId, async (tx) => {
    const [job] = await tx
      .select({
        attempts: backgroundJobs.attempts,
        maxAttempts: backgroundJobs.maxAttempts,
        lockedBy: backgroundJobs.lockedBy,
      })
      .from(backgroundJobs)
      .where(and(
        eq(backgroundJobs.id, jobId),
        eq(backgroundJobs.tenantId, tenantId)
      ));

    if (!job || job.lockedBy !== instanceId) return false;

    const shouldRetry = retry && job.attempts < job.maxAttempts;
    const backoffMs = calculateBackoff(job.attempts);

    const [row] = await tx
      .update(backgroundJobs)
      .set({
        status: shouldRetry ? JOB_STATUS.QUEUED : JOB_STATUS.FAILED,
        errorMessage,
        runAfter: shouldRetry ? new Date(Date.now() + backoffMs) : undefined,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(backgroundJobs.id, jobId),
        eq(backgroundJobs.tenantId, tenantId),
        eq(backgroundJobs.lockedBy, instanceId)
      ))
      .returning({ id: backgroundJobs.id });

    return !!row;
  });
}

function calculateBackoff(attempt: number): number {
  const baseMs = 1000;
  const maxMs = 5 * 60 * 1000;
  const jitter = Math.random() * 1000;
  return Math.min(baseMs * Math.pow(2, attempt) + jitter, maxMs);
}

const STUCK_JOB_THRESHOLD_MS = 10 * 60 * 1000;

export async function reapStuckJobs(tenantId: string): Promise<number> {
  const stuckThreshold = new Date(Date.now() - STUCK_JOB_THRESHOLD_MS);
  
  return withTenant(tenantId, async (tx) => {
    const result = await tx
      .update(backgroundJobs)
      .set({
        status: JOB_STATUS.QUEUED,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
        errorMessage: "Job timed out and was reclaimed by reaper",
      })
      .where(and(
        eq(backgroundJobs.tenantId, tenantId),
        eq(backgroundJobs.status, JOB_STATUS.PROCESSING),
        lte(backgroundJobs.lockedAt, stuckThreshold)
      ))
      .returning({ id: backgroundJobs.id });

    return result.length;
  });
}

export async function reapStuckJobsAllTenants(): Promise<number> {
  const stuckThreshold = new Date(Date.now() - STUCK_JOB_THRESHOLD_MS);
  
  const result = await db
    .update(backgroundJobs)
    .set({
      status: JOB_STATUS.QUEUED,
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
      errorMessage: "Job timed out and was reclaimed by reaper",
    })
    .where(and(
      eq(backgroundJobs.status, JOB_STATUS.PROCESSING),
      lte(backgroundJobs.lockedAt, stuckThreshold)
    ))
    .returning({ id: backgroundJobs.id });

  if (result.length > 0) {
    console.log(`[JOB_REAPER] Reclaimed ${result.length} stuck jobs`);
  }

  return result.length;
}
