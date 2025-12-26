import { serve } from "bun";
import index from "./index.html";

import { handleLogin, handleRefresh, handleLogout, handleGetMe } from "@/api/routes/auth";
import { handleHealth, handleReadiness } from "@/api/routes/health";
import {
  handleListAssets,
  handleGetAsset,
  handleCreateAsset,
  handleUpdateAsset,
  handleDeleteAsset,
  handleGetAssetStats,
} from "@/api/routes/assets";
import {
  handleListUsers,
  handleGetUser,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleChangePassword,
} from "@/api/routes/users";
import {
  handleGetTemplates,
  handleCreateTemplate,
  handleGetTemplate,
  handleUpdateTemplate,
  handleDeleteTemplate,
  handlePublishTemplate,
  handleUnpublishTemplate,
  handleDuplicateTemplate,
  handleGetTemplateVersion,
  handleRevertToVersion,
} from "@/api/routes/templates";
import {
  handleListPrintJobs,
  handleCreatePrintJob,
  handleGetPrintJob,
  handleGetPrintJobItems,
  handleRenderPrintJob,
  handleCancelPrintJob,
  handlePreview,
} from "@/api/routes/print";
import {
  handleListApiKeys,
  handleGetApiKey,
  handleCreateApiKey,
  handleUpdateApiKey,
  handleRevokeApiKey,
} from "@/api/routes/integrations";
import {
  handleListSubscriptions,
  handleGetSubscription,
  handleCreateSubscription,
  handleUpdateSubscription,
  handleDeleteSubscription,
  handleListOutbox,
  handleGetDeliveries,
  handleRetryOutbox,
} from "@/api/routes/webhooks";
import {
  handleListImportJobs,
  handleGetImportJob,
  handleCreateImportJob,
  handleGetImportJobErrors,
  handleListImportTemplates,
  handleCreateImportTemplate,
  handleDeleteImportTemplate,
  handleExportAssets,
} from "@/api/routes/imports";
import {
  handlePublicListAssets,
  handlePublicGetAsset,
  handlePublicCreateAsset,
  handlePublicListTemplates,
  handlePublicGetTemplate,
  handlePublicCreatePrintJob,
  handlePublicGetPrintJob,
  handlePublicRenderPrintJob,
} from "@/api/routes/public-api";
import {
  withLoginRateLimit,
  withRateLimit,
  AUTH_RATE_LIMIT,
  PRINT_JOB_RATE_LIMIT,
  PRINT_RENDER_RATE_LIMIT,
  PRINT_PREVIEW_RATE_LIMIT,
  IMPORT_RATE_LIMIT,
  EXPORT_RATE_LIMIT,
  WEBHOOK_RATE_LIMIT,
} from "@/api/middleware/rate-limit";
import { withCsrfProtection } from "@/api/middleware/csrf";

async function extractEmailFromLoginRequest(req: Request): Promise<string | null> {
  try {
    const body = await req.json();
    return body?.email ?? null;
  } catch {
    return null;
  }
}

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

function addSecurityHeaders(response: Response, requestId: string): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!newHeaders.has(key)) {
      newHeaders.set(key, value);
    }
  }
  newHeaders.set("X-Request-Id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

const rateLimitedLogin = withLoginRateLimit(handleLogin, extractEmailFromLoginRequest);
const rateLimitedRefresh = withRateLimit(AUTH_RATE_LIMIT, handleRefresh);
const rateLimitedCreatePrintJob = withRateLimit(PRINT_JOB_RATE_LIMIT, withCsrfProtection(handleCreatePrintJob));
const rateLimitedPreview = withRateLimit(PRINT_PREVIEW_RATE_LIMIT, withCsrfProtection(handlePreview));
const rateLimitedCreateImport = withRateLimit(IMPORT_RATE_LIMIT, withCsrfProtection(handleCreateImportJob));
const rateLimitedExport = withRateLimit(EXPORT_RATE_LIMIT, handleExportAssets);
const rateLimitedCreateWebhook = withRateLimit(WEBHOOK_RATE_LIMIT, withCsrfProtection(handleCreateSubscription));

const server = serve({
  routes: {
    "/*": index,

    "/api/health": {
      GET: handleHealth,
    },

    "/api/ready": {
      GET: handleReadiness,
    },

    "/api/auth/login": {
      POST: rateLimitedLogin,
    },

    "/api/auth/refresh": {
      POST: rateLimitedRefresh,
    },

    "/api/auth/logout": {
      POST: withCsrfProtection(handleLogout),
    },

    "/api/auth/me": {
      GET: handleGetMe,
    },

    "/api/auth/password": {
      PUT: withCsrfProtection(handleChangePassword),
    },

    "/api/assets": {
      GET: handleListAssets,
      POST: withCsrfProtection(handleCreateAsset),
    },

    "/api/assets/stats": {
      GET: handleGetAssetStats,
    },

    "/api/assets/:id": {
      GET: handleGetAsset,
      PUT: withCsrfProtection(handleUpdateAsset),
      DELETE: withCsrfProtection(handleDeleteAsset),
    },

    "/api/users": {
      GET: handleListUsers,
      POST: withCsrfProtection(handleCreateUser),
    },

    "/api/users/:id": {
      GET: handleGetUser,
      PUT: withCsrfProtection(handleUpdateUser),
      DELETE: withCsrfProtection(handleDeleteUser),
    },

    "/api/templates": {
      GET: handleGetTemplates,
      POST: withCsrfProtection(handleCreateTemplate),
    },

    "/api/templates/:id": {
      GET: handleGetTemplate,
      PUT: withCsrfProtection(handleUpdateTemplate),
      DELETE: withCsrfProtection(handleDeleteTemplate),
    },

    "/api/templates/:id/publish": {
      POST: withCsrfProtection(handlePublishTemplate),
      DELETE: withCsrfProtection(handleUnpublishTemplate),
    },

    "/api/templates/:id/duplicate": {
      POST: withCsrfProtection(handleDuplicateTemplate),
    },

    "/api/templates/:id/versions/:version": {
      GET: handleGetTemplateVersion,
    },

    "/api/templates/:id/versions/:version/revert": {
      POST: withCsrfProtection(handleRevertToVersion),
    },

    "/api/print/jobs": {
      GET: handleListPrintJobs,
      POST: rateLimitedCreatePrintJob,
    },

    "/api/print/jobs/:id": {
      GET: handleGetPrintJob,
      DELETE: withCsrfProtection(handleCancelPrintJob),
    },

    "/api/print/jobs/:id/items": {
      GET: handleGetPrintJobItems,
    },

    "/api/print/jobs/:id/pdf": {
      GET: withRateLimit(PRINT_RENDER_RATE_LIMIT, handleRenderPrintJob),
    },

    "/api/print/preview": {
      POST: rateLimitedPreview,
    },

    "/api/integrations/api-keys": {
      GET: handleListApiKeys,
      POST: withCsrfProtection(handleCreateApiKey),
    },

    "/api/integrations/api-keys/:id": {
      GET: handleGetApiKey,
      PUT: withCsrfProtection(handleUpdateApiKey),
      DELETE: withCsrfProtection(handleRevokeApiKey),
    },

    "/api/webhooks/subscriptions": {
      GET: handleListSubscriptions,
      POST: rateLimitedCreateWebhook,
    },

    "/api/webhooks/subscriptions/:id": {
      GET: handleGetSubscription,
      PUT: withRateLimit(WEBHOOK_RATE_LIMIT, withCsrfProtection(handleUpdateSubscription)),
      DELETE: withCsrfProtection(handleDeleteSubscription),
    },

    "/api/webhooks/outbox": {
      GET: handleListOutbox,
    },

    "/api/webhooks/outbox/:id/deliveries": {
      GET: handleGetDeliveries,
    },

    "/api/webhooks/outbox/:id/retry": {
      POST: withCsrfProtection(handleRetryOutbox),
    },

    "/api/imports": {
      GET: handleListImportJobs,
      POST: rateLimitedCreateImport,
    },

    "/api/imports/:id": {
      GET: handleGetImportJob,
    },

    "/api/imports/:id/errors": {
      GET: handleGetImportJobErrors,
    },

    "/api/import-templates": {
      GET: handleListImportTemplates,
      POST: withCsrfProtection(handleCreateImportTemplate),
    },

    "/api/import-templates/:id": {
      DELETE: withCsrfProtection(handleDeleteImportTemplate),
    },

    "/api/exports/assets": {
      GET: rateLimitedExport,
    },

    "/api/v1/assets": {
      GET: handlePublicListAssets,
      POST: handlePublicCreateAsset,
    },

    "/api/v1/assets/:id": {
      GET: handlePublicGetAsset,
    },

    "/api/v1/templates": {
      GET: handlePublicListTemplates,
    },

    "/api/v1/templates/:id": {
      GET: handlePublicGetTemplate,
    },

    "/api/v1/print/jobs": {
      POST: handlePublicCreatePrintJob,
    },

    "/api/v1/print/jobs/:id": {
      GET: handlePublicGetPrintJob,
    },

    "/api/v1/print/jobs/:id/pdf": {
      GET: handlePublicRenderPrintJob,
    },
  },

  async fetch(req, server) {
    const requestId = req.headers.get("x-request-id") ?? generateRequestId();
    const response = await server.fetch(req);
    
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Request-Id", requestId);
    
    if (process.env.NODE_ENV === "production") {
      return addSecurityHeaders(response, requestId);
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
