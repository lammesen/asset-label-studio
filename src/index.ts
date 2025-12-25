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
import { withLoginRateLimit, withRateLimit, AUTH_RATE_LIMIT } from "@/api/middleware/rate-limit";

async function extractEmailFromLoginRequest(req: Request): Promise<string | null> {
  try {
    const body = await req.json();
    return body?.email ?? null;
  } catch {
    return null;
  }
}

const rateLimitedLogin = withLoginRateLimit(handleLogin, extractEmailFromLoginRequest);
const rateLimitedRefresh = withRateLimit(AUTH_RATE_LIMIT, handleRefresh);

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
      POST: handleLogout,
    },

    "/api/auth/me": {
      GET: handleGetMe,
    },

    "/api/auth/password": {
      PUT: handleChangePassword,
    },

    "/api/assets": {
      GET: handleListAssets,
      POST: handleCreateAsset,
    },

    "/api/assets/stats": {
      GET: handleGetAssetStats,
    },

    "/api/assets/:id": {
      GET: handleGetAsset,
      PUT: handleUpdateAsset,
      DELETE: handleDeleteAsset,
    },

    "/api/users": {
      GET: handleListUsers,
      POST: handleCreateUser,
    },

    "/api/users/:id": {
      GET: handleGetUser,
      PUT: handleUpdateUser,
      DELETE: handleDeleteUser,
    },

    "/api/templates": {
      GET: handleGetTemplates,
      POST: handleCreateTemplate,
    },

    "/api/templates/:id": {
      GET: (req: Request, params: { id: string }) => handleGetTemplate(req, params.id),
      PUT: (req: Request, params: { id: string }) => handleUpdateTemplate(req, params.id),
      DELETE: (req: Request, params: { id: string }) => handleDeleteTemplate(req, params.id),
    },

    "/api/templates/:id/publish": {
      POST: (req: Request, params: { id: string }) => handlePublishTemplate(req, params.id),
      DELETE: (req: Request, params: { id: string }) => handleUnpublishTemplate(req, params.id),
    },

    "/api/templates/:id/duplicate": {
      POST: (req: Request, params: { id: string }) => handleDuplicateTemplate(req, params.id),
    },

    "/api/templates/:id/versions/:version": {
      GET: (req: Request, params: { id: string; version: string }) =>
        handleGetTemplateVersion(req, params.id, params.version),
    },

    "/api/templates/:id/versions/:version/revert": {
      POST: (req: Request, params: { id: string; version: string }) =>
        handleRevertToVersion(req, params.id, params.version),
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
