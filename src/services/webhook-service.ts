import { eq, and, desc, count, lte, or, sql } from "drizzle-orm";
import { createHash, randomBytes, createHmac, createCipheriv, createDecipheriv } from "crypto";

import { db } from "@/db";
import { webhookSubscriptions, webhookOutbox, webhookDeliveries } from "@/db/schema";
import { withTenant } from "@/lib/tenant";
import { validateOutboundWebhookUrl } from "@/lib/ssrf";
import { createAuditLog } from "@/services/audit-service";
import { enqueueJob } from "@/services/job-service";

// Encryption for webhook secrets
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits is the recommended IV size for AES-GCM
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.WEBHOOK_SECRET_KEY;
  if (!key) {
    throw new Error("WEBHOOK_SECRET_KEY environment variable is required");
  }
  // Ensure key is 32 bytes for AES-256
  return createHash("sha256").update(key).digest();
}

function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decryptSecret(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");
  
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }
  
  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = parts[2]!;
  
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

import type { TenantContext } from "@/types/tenant";
import type {
  WebhookSubscription,
  WebhookSubscriptionWithSecret,
  CreateWebhookSubscriptionInput,
  UpdateWebhookSubscriptionInput,
  WebhookOutboxEntry,
  WebhookDelivery,
  WebhookEnvelope,
  PublishEventInput,
  WebhookOutboxFilters,
  WebhookOutboxListResult,
  WebhookSubscriptionListResult,
  WebhookEventType,
  WebhookOutboxStatus,
} from "@/types/webhook";
import { WEBHOOK_OUTBOX_STATUS } from "@/types/webhook";
import { JOB_TYPES } from "@/types/background-job";
import { AUDIT_ACTIONS } from "@/types/audit";



function generateSecret(): { secret: string; encrypted: string } {
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;
  const encrypted = encryptSecret(secret);
  return { secret, encrypted };
}

function signPayload(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(signedPayload).digest("hex");
}

function mapSubscriptionRow(row: typeof webhookSubscriptions.$inferSelect): WebhookSubscription {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    url: row.url,
    eventTypes: row.eventTypes as WebhookEventType[],
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapOutboxRow(row: typeof webhookOutbox.$inferSelect): WebhookOutboxEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    subscriptionId: row.subscriptionId,
    eventType: row.eventType as WebhookEventType,
    eventId: row.eventId,
    payload: row.payload,
    status: row.status as WebhookOutboxStatus,
    attempts: row.attempts,
    nextRetryAt: row.nextRetryAt,
    lastAttemptAt: row.lastAttemptAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
    deliveredAt: row.deliveredAt,
  };
}

function mapDeliveryRow(row: typeof webhookDeliveries.$inferSelect): WebhookDelivery {
  return {
    id: row.id,
    tenantId: row.tenantId,
    outboxId: row.outboxId,
    requestHeaders: row.requestHeaders as Record<string, string> | null,
    requestBody: row.requestBody,
    responseStatus: row.responseStatus,
    responseHeaders: row.responseHeaders as Record<string, string> | null,
    responseBody: row.responseBody,
    durationMs: row.durationMs,
    attemptNumber: row.attemptNumber,
    success: row.success,
    createdAt: row.createdAt,
  };
}

export async function createWebhookSubscription(
  ctx: TenantContext,
  input: CreateWebhookSubscriptionInput
): Promise<WebhookSubscriptionWithSecret> {
  const validatedUrl = await validateOutboundWebhookUrl(input.url);

  return withTenant(ctx.tenantId, async (tx) => {
    const { secret, encrypted } = generateSecret();

    const [row] = await tx
      .insert(webhookSubscriptions)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        url: validatedUrl.toString(),
        secretHash: encrypted,
        eventTypes: input.eventTypes,
        createdBy: ctx.userId,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create webhook subscription");
    }

    await createAuditLog(ctx, {
      action: AUDIT_ACTIONS.WEBHOOK_SUBSCRIPTION_CREATED,
      resourceType: "webhook_subscription",
      resourceId: row.id,
      details: { name: input.name, eventTypes: input.eventTypes },
    });

    return {
      ...mapSubscriptionRow(row),
      secret,
    };
  });
}

export async function getWebhookSubscription(
  ctx: TenantContext,
  subscriptionId: string
): Promise<WebhookSubscription | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(webhookSubscriptions)
      .where(and(
        eq(webhookSubscriptions.id, subscriptionId),
        eq(webhookSubscriptions.tenantId, ctx.tenantId)
      ));

    return row ? mapSubscriptionRow(row) : null;
  });
}

export async function listWebhookSubscriptions(
  ctx: TenantContext,
  page = 1,
  pageSize = 20
): Promise<WebhookSubscriptionListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.tenantId, ctx.tenantId));

    const rows = await tx
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.tenantId, ctx.tenantId))
      .orderBy(desc(webhookSubscriptions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      subscriptions: rows.map(mapSubscriptionRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

export async function updateWebhookSubscription(
  ctx: TenantContext,
  subscriptionId: string,
  input: UpdateWebhookSubscriptionInput
): Promise<WebhookSubscription | null> {
  let validatedUrl: URL | undefined;
  if (input.url) {
    validatedUrl = await validateOutboundWebhookUrl(input.url);
  }

  return withTenant(ctx.tenantId, async (tx) => {
    const updateData: Partial<typeof webhookSubscriptions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (validatedUrl !== undefined) updateData.url = validatedUrl.toString();
    if (input.eventTypes !== undefined) updateData.eventTypes = input.eventTypes;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [row] = await tx
      .update(webhookSubscriptions)
      .set(updateData)
      .where(and(
        eq(webhookSubscriptions.id, subscriptionId),
        eq(webhookSubscriptions.tenantId, ctx.tenantId)
      ))
      .returning();

    if (row) {
      await createAuditLog(ctx, {
        action: AUDIT_ACTIONS.WEBHOOK_SUBSCRIPTION_UPDATED,
        resourceType: "webhook_subscription",
        resourceId: subscriptionId,
        details: { ...input },
      });
    }

    return row ? mapSubscriptionRow(row) : null;
  });
}

export async function deleteWebhookSubscription(
  ctx: TenantContext,
  subscriptionId: string
): Promise<boolean> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .delete(webhookSubscriptions)
      .where(and(
        eq(webhookSubscriptions.id, subscriptionId),
        eq(webhookSubscriptions.tenantId, ctx.tenantId)
      ))
      .returning({ id: webhookSubscriptions.id });

    if (row) {
      await createAuditLog(ctx, {
        action: AUDIT_ACTIONS.WEBHOOK_SUBSCRIPTION_DELETED,
        resourceType: "webhook_subscription",
        resourceId: subscriptionId,
      });
    }

    return !!row;
  });
}

export async function publishEvent(
  ctx: TenantContext,
  input: PublishEventInput
): Promise<void> {
  await withTenant(ctx.tenantId, async (tx) => {
    const subscriptions = await tx
      .select()
      .from(webhookSubscriptions)
      .where(and(
        eq(webhookSubscriptions.tenantId, ctx.tenantId),
        eq(webhookSubscriptions.isActive, true)
      ));

    const matchingSubscriptions = subscriptions.filter((sub) => {
      const eventTypes = sub.eventTypes as WebhookEventType[];
      return eventTypes.includes(input.type);
    });

    for (const subscription of matchingSubscriptions) {
      const eventId = `evt_${randomBytes(16).toString("hex")}`;
      const envelope: WebhookEnvelope = {
        id: eventId,
        type: input.type,
        tenantId: ctx.tenantId,
        createdAt: new Date().toISOString(),
        data: input.data,
      };

      await tx
        .insert(webhookOutbox)
        .values({
          tenantId: ctx.tenantId,
          subscriptionId: subscription.id,
          eventType: input.type,
          eventId,
          payload: envelope,
          status: WEBHOOK_OUTBOX_STATUS.PENDING,
          nextRetryAt: new Date(),
        });
    }
  });

  await enqueueJob(ctx, {
    type: JOB_TYPES.WEBHOOK_DELIVER,
    payload: { tenantId: ctx.tenantId },
    priority: 10,
  });
}

export async function listWebhookOutbox(
  ctx: TenantContext,
  filters: WebhookOutboxFilters = {},
  page = 1,
  pageSize = 20
): Promise<WebhookOutboxListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const conditions = [eq(webhookOutbox.tenantId, ctx.tenantId)];

    if (filters.status) {
      conditions.push(eq(webhookOutbox.status, filters.status));
    }
    if (filters.eventType) {
      conditions.push(eq(webhookOutbox.eventType, filters.eventType));
    }
    if (filters.subscriptionId) {
      conditions.push(eq(webhookOutbox.subscriptionId, filters.subscriptionId));
    }

    const whereClause = and(...conditions);

    const [countResult] = await tx
      .select({ count: count() })
      .from(webhookOutbox)
      .where(whereClause);

    const rows = await tx
      .select()
      .from(webhookOutbox)
      .where(whereClause)
      .orderBy(desc(webhookOutbox.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      entries: rows.map(mapOutboxRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

export async function getWebhookDeliveries(
  ctx: TenantContext,
  outboxId: string
): Promise<WebhookDelivery[]> {
  return withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(webhookDeliveries)
      .where(and(
        eq(webhookDeliveries.outboxId, outboxId),
        eq(webhookDeliveries.tenantId, ctx.tenantId)
      ))
      .orderBy(desc(webhookDeliveries.createdAt));

    return rows.map(mapDeliveryRow);
  });
}

export async function retryWebhookOutbox(
  ctx: TenantContext,
  outboxId: string
): Promise<boolean> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .update(webhookOutbox)
      .set({
        status: WEBHOOK_OUTBOX_STATUS.PENDING,
        nextRetryAt: new Date(),
        attempts: 0,
      })
      .where(and(
        eq(webhookOutbox.id, outboxId),
        eq(webhookOutbox.tenantId, ctx.tenantId),
        eq(webhookOutbox.status, WEBHOOK_OUTBOX_STATUS.DEAD_LETTER)
      ))
      .returning({ id: webhookOutbox.id });

    if (row) {
      await enqueueJob(ctx, {
        type: JOB_TYPES.WEBHOOK_DELIVER,
        payload: { tenantId: ctx.tenantId, outboxId },
        priority: 10,
      });
    }

    return !!row;
  });
}

export async function processWebhookOutboxForTenant(tenantId: string): Promise<number> {
  const maxAttempts = 5;
  let processed = 0;
  let hasMore = true;

  while (hasMore) {
    const entry = await withTenant(tenantId, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT 
          o.id as outbox_id,
          o.tenant_id as outbox_tenant_id,
          o.event_id as outbox_event_id,
          o.payload as outbox_payload,
          o.attempts as outbox_attempts,
          s.url as sub_url,
          s.secret_hash as sub_secret_hash
        FROM webhook_outbox o
        INNER JOIN webhook_subscriptions s ON o.subscription_id = s.id
        WHERE o.tenant_id = ${tenantId}
          AND o.status = 'pending' 
          AND o.next_retry_at <= NOW()
        ORDER BY o.next_retry_at
        LIMIT 1
        FOR UPDATE OF o SKIP LOCKED
      `);

      const rowArray = rows as unknown as Array<{
        outbox_id: string;
        outbox_tenant_id: string;
        outbox_event_id: string;
        outbox_payload: unknown;
        outbox_attempts: number;
        sub_url: string;
        sub_secret_hash: string;
      }>;

      if (rowArray.length === 0) {
        return null;
      }

      const row = rowArray[0]!;

      await tx
        .update(webhookOutbox)
        .set({ status: WEBHOOK_OUTBOX_STATUS.PROCESSING })
        .where(eq(webhookOutbox.id, row.outbox_id));

      return row;
    });

    if (!entry) {
      hasMore = false;
      break;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(entry.outbox_payload);
    
    let actualSecret: string;
    try {
      actualSecret = decryptSecret(entry.sub_secret_hash);
    } catch {
      await withTenant(tenantId, async (tx) => {
        await tx
          .update(webhookOutbox)
          .set({
            status: WEBHOOK_OUTBOX_STATUS.DEAD_LETTER,
            lastAttemptAt: new Date(),
            lastError: "Failed to decrypt webhook secret",
          })
          .where(eq(webhookOutbox.id, entry.outbox_id));
      });
      processed++;
      continue;
    }

    try {
      await validateOutboundWebhookUrl(entry.sub_url);
    } catch (ssrfError) {
      await withTenant(tenantId, async (tx) => {
        await tx
          .update(webhookOutbox)
          .set({
            status: WEBHOOK_OUTBOX_STATUS.DEAD_LETTER,
            lastAttemptAt: new Date(),
            lastError: ssrfError instanceof Error ? ssrfError.message : "URL validation failed",
          })
          .where(eq(webhookOutbox.id, entry.outbox_id));
      });
      processed++;
      continue;
    }

    const signature = signPayload(payloadString, actualSecret, timestamp);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Id": entry.outbox_event_id,
      "X-Webhook-Timestamp": String(timestamp),
      "X-Webhook-Signature": `sha256=${signature}`,
    };

    const startTime = Date.now();
    let success = false;
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(entry.sub_url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
        redirect: "manual",
      });

      clearTimeout(timeoutId);

      if (response.status >= 300 && response.status < 400) {
        errorMessage = `Redirect not allowed (HTTP ${response.status})`;
      } else {
        responseStatus = response.status;
        responseBody = await response.text().catch(() => null);
        success = response.ok;

        if (!success) {
          errorMessage = `HTTP ${response.status}`;
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown error";
    }

    const durationMs = Date.now() - startTime;
    const newAttempts = entry.outbox_attempts + 1;

    await withTenant(tenantId, async (tx) => {
      await tx
        .insert(webhookDeliveries)
        .values({
          tenantId: entry.outbox_tenant_id,
          outboxId: entry.outbox_id,
          requestHeaders: headers,
          requestBody: entry.outbox_payload,
          responseStatus,
          responseBody: responseBody?.slice(0, 10000),
          durationMs,
          attemptNumber: newAttempts,
          success,
        });

      if (success) {
        await tx
          .update(webhookOutbox)
          .set({
            status: WEBHOOK_OUTBOX_STATUS.DELIVERED,
            deliveredAt: new Date(),
            lastAttemptAt: new Date(),
            attempts: newAttempts,
          })
          .where(eq(webhookOutbox.id, entry.outbox_id));
      } else {
        const nextStatus = newAttempts >= maxAttempts
          ? WEBHOOK_OUTBOX_STATUS.DEAD_LETTER
          : WEBHOOK_OUTBOX_STATUS.PENDING;
        
        const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 5 * 60 * 1000);
        const nextRetry = new Date(Date.now() + backoffMs);

        await tx
          .update(webhookOutbox)
          .set({
            status: nextStatus,
            attempts: newAttempts,
            lastAttemptAt: new Date(),
            lastError: errorMessage,
            nextRetryAt: nextStatus === WEBHOOK_OUTBOX_STATUS.PENDING ? nextRetry : null,
          })
          .where(eq(webhookOutbox.id, entry.outbox_id));
      }
    });

    processed++;
  }

  return processed;
}
