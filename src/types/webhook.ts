export const WEBHOOK_EVENT_TYPES = {
  ASSET_CREATED: "asset.created",
  ASSET_UPDATED: "asset.updated",
  ASSET_DELETED: "asset.deleted",
  PRINT_COMPLETED: "print.completed",
  PRINT_FAILED: "print.failed",
  IMPORT_COMPLETED: "import.completed",
  IMPORT_FAILED: "import.failed",
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES];

export const WEBHOOK_OUTBOX_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DELIVERED: "delivered",
  DEAD_LETTER: "dead_letter",
} as const;

export type WebhookOutboxStatus = (typeof WEBHOOK_OUTBOX_STATUS)[keyof typeof WEBHOOK_OUTBOX_STATUS];

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  eventTypes: WebhookEventType[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookSubscriptionWithSecret extends WebhookSubscription {
  secret: string;
}

export interface CreateWebhookSubscriptionInput {
  name: string;
  url: string;
  eventTypes: WebhookEventType[];
}

export interface UpdateWebhookSubscriptionInput {
  name?: string;
  url?: string;
  eventTypes?: WebhookEventType[];
  isActive?: boolean;
}

export interface WebhookOutboxEntry {
  id: string;
  tenantId: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  eventId: string;
  payload: unknown;
  status: WebhookOutboxStatus;
  attempts: number;
  nextRetryAt: Date | null;
  lastAttemptAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
}

export interface WebhookDelivery {
  id: string;
  tenantId: string;
  outboxId: string;
  requestHeaders: Record<string, string> | null;
  requestBody: unknown;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  durationMs: number | null;
  attemptNumber: number;
  success: boolean;
  createdAt: Date;
}

export interface WebhookEnvelope {
  id: string;
  type: WebhookEventType;
  tenantId: string;
  createdAt: string;
  data: unknown;
}

export interface PublishEventInput {
  type: WebhookEventType;
  data: unknown;
  resourceId?: string;
}

export interface WebhookOutboxFilters {
  status?: WebhookOutboxStatus;
  eventType?: WebhookEventType;
  subscriptionId?: string;
}

export interface WebhookOutboxListResult {
  entries: WebhookOutboxEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WebhookSubscriptionListResult {
  subscriptions: WebhookSubscription[];
  total: number;
  page: number;
  pageSize: number;
}
