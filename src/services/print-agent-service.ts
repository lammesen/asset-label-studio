import { eq, and, desc, count, lte } from "drizzle-orm";

import { db } from "@/db";
import { printAgents, printAgentPrinters, printDispatches, printJobs } from "@/db/schema";
import { withTenant } from "@/lib/tenant";
import { createAuditLog } from "@/services/audit-service";

import type { TenantContext } from "@/types/tenant";
import type {
  PrintAgent,
  PrintAgentPrinter,
  PrintDispatch,
  PrintAgentCapabilities,
  PrinterInfo,
  CreateDispatchInput,
  PrintAgentListResult,
  AgentStatus,
  DispatchStatus,
  PrinterLanguage,
} from "@/types/print-agent";
import { AGENT_STATUS, DISPATCH_STATUS, PRINTER_LANGUAGES } from "@/types/print-agent";
import { AUDIT_ACTIONS } from "@/types/audit";

function mapAgentRow(row: typeof printAgents.$inferSelect): PrintAgent {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    status: row.status as AgentStatus,
    lastSeenAt: row.lastSeenAt,
    version: row.version,
    capabilities: row.capabilities as PrintAgentCapabilities,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function mapPrinterRow(row: typeof printAgentPrinters.$inferSelect): PrintAgentPrinter {
  return {
    id: row.id,
    tenantId: row.tenantId,
    agentId: row.agentId,
    name: row.name,
    location: row.location,
    driver: row.driver,
    languages: row.languages as PrinterLanguage[],
    dpi: row.dpi,
    isDefault: row.isDefault,
  };
}

function mapDispatchRow(row: typeof printDispatches.$inferSelect): PrintDispatch {
  return {
    id: row.id,
    tenantId: row.tenantId,
    printJobId: row.printJobId,
    agentId: row.agentId,
    printerId: row.printerId,
    payloadFormat: row.payloadFormat as PrinterLanguage,
    status: row.status as DispatchStatus,
    attempts: row.attempts,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function registerAgent(
  ctx: TenantContext,
  name: string,
  version: string,
  capabilities: PrintAgentCapabilities
): Promise<PrintAgent> {
  return withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select()
      .from(printAgents)
      .where(and(
        eq(printAgents.tenantId, ctx.tenantId),
        eq(printAgents.name, name)
      ));

    if (existing.length > 0 && existing[0]) {
      const [updated] = await tx
        .update(printAgents)
        .set({
          status: AGENT_STATUS.ONLINE,
          lastSeenAt: new Date(),
          version,
          capabilities,
        })
        .where(eq(printAgents.id, existing[0].id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update agent");
      }

      return mapAgentRow(updated);
    }

    const [row] = await tx
      .insert(printAgents)
      .values({
        tenantId: ctx.tenantId,
        name,
        status: AGENT_STATUS.ONLINE,
        lastSeenAt: new Date(),
        version,
        capabilities,
        createdBy: ctx.userId,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to register agent");
    }

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.PRINT_AGENT_REGISTERED,
      resourceType: "print_agent",
      resourceId: row.id,
      details: { name, version },
    });

    return mapAgentRow(row);
  });
}

export async function updateAgentHeartbeat(
  agentId: string,
  tenantId: string
): Promise<void> {
  await db
    .update(printAgents)
    .set({
      lastSeenAt: new Date(),
      status: AGENT_STATUS.ONLINE,
    })
    .where(and(
      eq(printAgents.id, agentId),
      eq(printAgents.tenantId, tenantId)
    ));
}

export async function setAgentOffline(
  agentId: string,
  tenantId: string
): Promise<void> {
  await db
    .update(printAgents)
    .set({ status: AGENT_STATUS.OFFLINE })
    .where(and(
      eq(printAgents.id, agentId),
      eq(printAgents.tenantId, tenantId)
    ));
}

export async function upsertPrinters(
  ctx: TenantContext,
  agentId: string,
  printers: PrinterInfo[]
): Promise<void> {
  return withTenant(ctx.tenantId, async (tx) => {
    await tx
      .delete(printAgentPrinters)
      .where(and(
        eq(printAgentPrinters.agentId, agentId),
        eq(printAgentPrinters.tenantId, ctx.tenantId)
      ));

    if (printers.length === 0) return;

    await tx
      .insert(printAgentPrinters)
      .values(printers.map((p) => ({
        tenantId: ctx.tenantId,
        agentId,
        name: p.name,
        location: p.location ?? null,
        driver: p.driver ?? null,
        languages: p.languages,
        dpi: p.dpi ?? null,
        isDefault: p.isDefault ?? false,
      })));
  });
}

export async function listAgents(
  ctx: TenantContext,
  page = 1,
  pageSize = 20
): Promise<PrintAgentListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(printAgents)
      .where(eq(printAgents.tenantId, ctx.tenantId));

    const rows = await tx
      .select()
      .from(printAgents)
      .where(eq(printAgents.tenantId, ctx.tenantId))
      .orderBy(desc(printAgents.lastSeenAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      agents: rows.map(mapAgentRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

export async function getAgent(
  ctx: TenantContext,
  agentId: string
): Promise<PrintAgent | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(printAgents)
      .where(and(
        eq(printAgents.id, agentId),
        eq(printAgents.tenantId, ctx.tenantId)
      ));

    return row ? mapAgentRow(row) : null;
  });
}

export async function getAgentPrinters(
  ctx: TenantContext,
  agentId: string
): Promise<PrintAgentPrinter[]> {
  return withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(printAgentPrinters)
      .where(and(
        eq(printAgentPrinters.agentId, agentId),
        eq(printAgentPrinters.tenantId, ctx.tenantId)
      ));

    return rows.map(mapPrinterRow);
  });
}

export async function createDispatch(
  ctx: TenantContext,
  input: CreateDispatchInput
): Promise<PrintDispatch> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [job] = await tx
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(and(
        eq(printJobs.id, input.printJobId),
        eq(printJobs.tenantId, ctx.tenantId)
      ));

    if (!job) {
      throw new Error("Print job not found");
    }

    const [agent] = await tx
      .select({ id: printAgents.id, status: printAgents.status })
      .from(printAgents)
      .where(and(
        eq(printAgents.id, input.agentId),
        eq(printAgents.tenantId, ctx.tenantId)
      ));

    if (!agent) {
      throw new Error("Print agent not found");
    }

    if (agent.status !== AGENT_STATUS.ONLINE) {
      throw new Error("Print agent is not online");
    }

    const [row] = await tx
      .insert(printDispatches)
      .values({
        tenantId: ctx.tenantId,
        printJobId: input.printJobId,
        agentId: input.agentId,
        printerId: input.printerId,
        payloadFormat: input.format,
        status: DISPATCH_STATUS.QUEUED,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create dispatch");
    }

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.PRINT_DISPATCHED,
      resourceType: "print_dispatch",
      resourceId: row.id,
      details: {
        printJobId: input.printJobId,
        agentId: input.agentId,
        format: input.format,
      },
    });

    return mapDispatchRow(row);
  });
}

export async function updateDispatchStatus(
  dispatchId: string,
  tenantId: string,
  status: DispatchStatus,
  error?: string
): Promise<void> {
  await db
    .update(printDispatches)
    .set({
      status,
      lastError: error ?? null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(printDispatches.id, dispatchId),
      eq(printDispatches.tenantId, tenantId)
    ));
}

export async function getDispatch(
  ctx: TenantContext,
  dispatchId: string
): Promise<PrintDispatch | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(printDispatches)
      .where(and(
        eq(printDispatches.id, dispatchId),
        eq(printDispatches.tenantId, ctx.tenantId)
      ));

    return row ? mapDispatchRow(row) : null;
  });
}

export async function markStaleAgentsOffline(): Promise<number> {
  const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);

  const result = await db
    .update(printAgents)
    .set({ status: AGENT_STATUS.OFFLINE })
    .where(and(
      eq(printAgents.status, AGENT_STATUS.ONLINE),
      lte(printAgents.lastSeenAt, staleThreshold)
    ))
    .returning({ id: printAgents.id });

  return result.length;
}
