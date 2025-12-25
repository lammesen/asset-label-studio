import { db, schema } from "@/db";
import { and, eq, gte, lte, desc, count } from "drizzle-orm";

import type { TenantContext } from "@/types/tenant";
import type {
  AuditAction,
  AuditSeverity,
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogListResult,
} from "@/types/audit";
import { AUDIT_SEVERITY } from "@/types/audit";

export async function createAuditLog(
  ctx: TenantContext | { tenantId: string; userId: string | null },
  input: CreateAuditLogInput
): Promise<void> {
  await db.insert(schema.auditLogs).values({
    tenantId: ctx.tenantId,
    userId: "userId" in ctx ? ctx.userId : null,
    action: input.action,
    severity: input.severity ?? AUDIT_SEVERITY.INFO,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    details: input.details ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}

export async function logAuthEvent(
  tenantId: string,
  userId: string | null,
  action: AuditAction,
  details: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await createAuditLog(
    { tenantId, userId },
    {
      action,
      severity: action.includes("failed") ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
      resourceType: "session",
      details,
      ipAddress: req ? getClientIP(req) : undefined,
      userAgent: req?.headers.get("user-agent") ?? undefined,
    }
  );
}

export async function getAuditLogs(
  tenantId: string,
  filters: AuditLogFilters,
  page = 1,
  pageSize = 50
): Promise<AuditLogListResult> {
  const conditions = [eq(schema.auditLogs.tenantId, tenantId)];

  if (filters.userId) {
    conditions.push(eq(schema.auditLogs.userId, filters.userId));
  }
  if (filters.action) {
    conditions.push(eq(schema.auditLogs.action, filters.action));
  }
  if (filters.severity) {
    conditions.push(eq(schema.auditLogs.severity, filters.severity));
  }
  if (filters.resourceType) {
    conditions.push(eq(schema.auditLogs.resourceType, filters.resourceType));
  }
  if (filters.resourceId) {
    conditions.push(eq(schema.auditLogs.resourceId, filters.resourceId));
  }
  if (filters.startDate) {
    conditions.push(gte(schema.auditLogs.createdAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(schema.auditLogs.createdAt, filters.endDate));
  }

  const offset = (page - 1) * pageSize;

  const [logs, countResult] = await Promise.all([
    db
      .select()
      .from(schema.auditLogs)
      .where(and(...conditions))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(schema.auditLogs)
      .where(and(...conditions)),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action as AuditAction,
      severity: log.severity as AuditSeverity,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details as Record<string, unknown>,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    })),
    total: countResult[0]?.total ?? 0,
    page,
    pageSize,
  };
}

function getClientIP(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return undefined;
}
