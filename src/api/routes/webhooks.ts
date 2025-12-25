import { z } from "zod";

import { withAuth } from "@/api/middleware/auth";
import { requirePermission } from "@/api/middleware/permissions";
import { checkRateLimitDb, WEBHOOK_RETRY_RATE_LIMIT } from "@/api/middleware/rate-limit";
import {
  createWebhookSubscription,
  getWebhookSubscription,
  listWebhookSubscriptions,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  listWebhookOutbox,
  getWebhookDeliveries,
  retryWebhookOutbox,
} from "@/services/webhook-service";
import { PERMISSIONS } from "@/types/permissions";
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from "@/types/webhook";

import type { TenantContext } from "@/types/tenant";

async function checkRetryRateLimit(tenantId: string): Promise<boolean> {
  const key = `webhook-retry:${tenantId}`;
  const result = await checkRateLimitDb(key, WEBHOOK_RETRY_RATE_LIMIT);
  return result.allowed;
}

const eventTypeValues = Object.values(WEBHOOK_EVENT_TYPES);

const createSubscriptionSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  eventTypes: z.array(z.enum(eventTypeValues as [string, ...string[]])).min(1),
});

const updateSubscriptionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  eventTypes: z.array(z.enum(eventTypeValues as [string, ...string[]])).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const handleListSubscriptions = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

      const result = await listWebhookSubscriptions(ctx, page, pageSize);
      return Response.json(result);
    } catch (error) {
      console.error("List subscriptions error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleGetSubscription = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const subscriptionId = url.pathname.split("/").pop();

      if (!subscriptionId) {
        return Response.json({ error: "Subscription ID required" }, { status: 400 });
      }

      const subscription = await getWebhookSubscription(ctx, subscriptionId);
      if (!subscription) {
        return Response.json({ error: "Subscription not found" }, { status: 404 });
      }

      return Response.json({ subscription });
    } catch (error) {
      console.error("Get subscription error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleCreateSubscription = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const body = await req.json();
      const parsed = createSubscriptionSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const subscription = await createWebhookSubscription(ctx, {
        name: parsed.data.name,
        url: parsed.data.url,
        eventTypes: parsed.data.eventTypes as WebhookEventType[],
      });

      return Response.json({ subscription }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("Create subscription error:", error);
      return Response.json({ error: message }, { status: 400 });
    }
  })
);

export const handleUpdateSubscription = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const subscriptionId = url.pathname.split("/").pop();

      if (!subscriptionId) {
        return Response.json({ error: "Subscription ID required" }, { status: 400 });
      }

      const body = await req.json();
      const parsed = updateSubscriptionSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const subscription = await updateWebhookSubscription(ctx, subscriptionId, {
        name: parsed.data.name,
        url: parsed.data.url,
        eventTypes: parsed.data.eventTypes as WebhookEventType[] | undefined,
        isActive: parsed.data.isActive,
      });

      if (!subscription) {
        return Response.json({ error: "Subscription not found" }, { status: 404 });
      }

      return Response.json({ subscription });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("Update subscription error:", error);
      return Response.json({ error: message }, { status: 400 });
    }
  })
);

export const handleDeleteSubscription = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const subscriptionId = url.pathname.split("/").pop();

      if (!subscriptionId) {
        return Response.json({ error: "Subscription ID required" }, { status: 400 });
      }

      const success = await deleteWebhookSubscription(ctx, subscriptionId);
      if (!success) {
        return Response.json({ error: "Subscription not found" }, { status: 404 });
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete subscription error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleListOutbox = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
      const status = url.searchParams.get("status") ?? undefined;
      const eventType = url.searchParams.get("eventType") ?? undefined;

      const result = await listWebhookOutbox(
        ctx,
        { status: status as never, eventType: eventType as never },
        page,
        pageSize
      );
      return Response.json(result);
    } catch (error) {
      console.error("List outbox error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleGetDeliveries = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const outboxId = pathParts[pathParts.length - 2];

      if (!outboxId) {
        return Response.json({ error: "Outbox ID required" }, { status: 400 });
      }

      const deliveries = await getWebhookDeliveries(ctx, outboxId);
      return Response.json({ deliveries });
    } catch (error) {
      console.error("Get deliveries error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleRetryOutbox = withAuth(
  requirePermission(PERMISSIONS.WEBHOOK_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const allowed = await checkRetryRateLimit(ctx.tenantId);
      if (!allowed) {
        return Response.json(
          { error: `Rate limit exceeded. Maximum ${WEBHOOK_RETRY_RATE_LIMIT.maxRequests} retries per minute.` },
          { status: 429 }
        );
      }

      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const outboxId = pathParts[pathParts.length - 2];

      if (!outboxId) {
        return Response.json({ error: "Outbox ID required" }, { status: 400 });
      }

      const success = await retryWebhookOutbox(ctx, outboxId);
      if (!success) {
        return Response.json({ error: "Outbox entry not found or not in dead_letter status" }, { status: 400 });
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Retry outbox error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);
