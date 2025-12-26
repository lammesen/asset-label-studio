import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";

import type { TenantContext } from "@/types/tenant";
import type { Permission } from "@/types/permissions";
import type { Database } from "@/db";

const TENANT_CONTEXT_SYMBOL = Symbol("tenantContext");

interface RequestWithContext extends Request {
  [TENANT_CONTEXT_SYMBOL]?: TenantContext;
}

export function setTenantContext(req: Request, ctx: TenantContext): void {
  (req as RequestWithContext)[TENANT_CONTEXT_SYMBOL] = ctx;
}

export function getTenantContext(req: Request): TenantContext | undefined {
  return (req as RequestWithContext)[TENANT_CONTEXT_SYMBOL];
}

export function requireTenantContext(req: Request): TenantContext {
  const ctx = getTenantContext(req);
  if (!ctx) {
    throw new Error("Tenant context not found. Authentication required.");
  }
  return ctx;
}

export function hasPermission(ctx: TenantContext, permission: Permission): boolean {
  return ctx.permissions.includes(permission);
}

export function requirePermission(ctx: TenantContext, permission: Permission): void {
  if (!hasPermission(ctx, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export async function getTenantById(tenantId: string) {
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  return tenant ?? null;
}

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);
  return tenant ?? null;
}

export async function getTenantByDomain(domain: string) {
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.domain, domain))
    .limit(1);
  return tenant ?? null;
}

export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Database) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    return fn(tx as unknown as Database);
  });
}

export async function withTenantContext<T>(
  ctx: TenantContext,
  fn: (tx: Database) => Promise<T>
): Promise<T> {
  return withTenant(ctx.tenantId, fn);
}
