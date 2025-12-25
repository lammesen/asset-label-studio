import { eq, and, desc, isNull, count, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { withTenant } from "@/lib/tenant";
import { createAuditLog } from "@/services/audit-service";

import type { TenantContext } from "@/types/tenant";
import type { Permission } from "@/types/permissions";
import type {
  ApiKey,
  ApiKeyWithSecret,
  CreateApiKeyInput,
  UpdateApiKeyInput,
  ApiKeyListResult,
  ApiKeyContext,
} from "@/types/api-key";
import { AUDIT_ACTIONS } from "@/types/audit";

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = "als_";
  const secret = randomBytes(32).toString("base64url");
  const key = `${prefix}${secret}`;
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix: key.slice(0, 12), hash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function mapKeyRow(row: typeof apiKeys.$inferSelect): ApiKey {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    permissions: row.permissions as Permission[],
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

export async function createApiKey(
  ctx: TenantContext,
  input: CreateApiKeyInput
): Promise<ApiKeyWithSecret> {
  return withTenant(ctx.tenantId, async (tx) => {
    const { key, prefix, hash } = generateApiKey();

    const [row] = await tx
      .insert(apiKeys)
      .values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        name: input.name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: input.permissions,
        expiresAt: input.expiresAt,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create API key");
    }

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.API_KEY_CREATED,
      resourceType: "api_key",
      resourceId: row.id,
      details: { name: input.name, permissions: input.permissions },
    });

    return {
      ...mapKeyRow(row),
      secret: key,
    };
  });
}

export async function getApiKey(
  ctx: TenantContext,
  keyId: string
): Promise<ApiKey | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.tenantId, ctx.tenantId)
      ));

    return row ? mapKeyRow(row) : null;
  });
}

export async function listApiKeys(
  ctx: TenantContext,
  page = 1,
  pageSize = 20
): Promise<ApiKeyListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, ctx.tenantId));

    const rows = await tx
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, ctx.tenantId))
      .orderBy(desc(apiKeys.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      keys: rows.map(mapKeyRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

export async function updateApiKey(
  ctx: TenantContext,
  keyId: string,
  input: UpdateApiKeyInput
): Promise<ApiKey | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const updateData: Partial<typeof apiKeys.$inferInsert> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.permissions !== undefined) {
      updateData.permissions = input.permissions;
    }

    const [row] = await tx
      .update(apiKeys)
      .set(updateData)
      .where(and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.tenantId, ctx.tenantId),
        isNull(apiKeys.revokedAt)
      ))
      .returning();

    if (row) {
      await createAuditLog(ctx, {
        action: AUDIT_ACTIONS.API_KEY_UPDATED,
        resourceType: "api_key",
        resourceId: keyId,
        details: { ...input },
      });
    }

    return row ? mapKeyRow(row) : null;
  });
}

export async function revokeApiKey(
  ctx: TenantContext,
  keyId: string
): Promise<boolean> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.tenantId, ctx.tenantId),
        isNull(apiKeys.revokedAt)
      ))
      .returning({ id: apiKeys.id });

    if (row) {
      await createAuditLog(ctx, {
        action: AUDIT_ACTIONS.API_KEY_REVOKED,
        resourceType: "api_key",
        resourceId: keyId,
      });
    }

    return !!row;
  });
}

export async function validateApiKey(key: string): Promise<ApiKeyContext | null> {
  const keyHash = hashApiKey(key);

  const result = await db.execute(sql`
    SELECT * FROM lookup_api_key(${keyHash})
  `);

  const rows = result as unknown as Array<{
    api_key_id: string;
    tenant_id: string;
    user_id: string;
    permissions: unknown;
    expires_at: Date | null;
    revoked_at: Date | null;
  }>;

  const match = rows[0];
  if (!match || match.revoked_at) {
    return null;
  }

  if (match.expires_at && match.expires_at < new Date()) {
    return null;
  }

  await withTenant(match.tenant_id, async (tx) => {
    await tx
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, match.api_key_id));
  });

  return {
    tenantId: match.tenant_id,
    userId: match.user_id,
    apiKeyId: match.api_key_id,
    permissions: match.permissions as Permission[],
  };
}
