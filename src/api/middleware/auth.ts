import { verifyAccessToken, parseCookies } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant";
import { getPermissionsForRole } from "@/lib/permissions";
import { getSessionInfo } from "@/services/auth-service";

import type { TenantContext } from "@/types/tenant";

export type RouteHandler = (req: Request) => Promise<Response> | Response;
export type AuthenticatedHandler = (req: Request, ctx: TenantContext) => Promise<Response> | Response;

const UNAUTHORIZED_RESPONSE = { error: "Unauthorized" };

export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const cookies = parseCookies(req.headers.get("cookie") ?? "");
    const accessToken = cookies["access_token"];

    if (!accessToken) {
      return Response.json(UNAUTHORIZED_RESPONSE, { status: 401 });
    }

    const payload = await verifyAccessToken(accessToken);
    if (!payload) {
      return Response.json(UNAUTHORIZED_RESPONSE, { status: 401 });
    }

    const sessionInfo = await getSessionInfo(payload.sid, payload.tid);
    if (!sessionInfo) {
      return Response.json(UNAUTHORIZED_RESPONSE, { status: 401 });
    }

    if (sessionInfo.userId !== payload.sub || sessionInfo.tenantId !== payload.tid) {
      return Response.json(UNAUTHORIZED_RESPONSE, { status: 401 });
    }

    const ctx: TenantContext = {
      tenantId: sessionInfo.tenantId,
      userId: sessionInfo.userId,
      sessionId: sessionInfo.sessionId,
      permissions: getPermissionsForRole(sessionInfo.role),
    };

    setTenantContext(req, ctx);

    return handler(req, ctx);
  };
}

export function withOptionalAuth(
  handler: (req: Request, ctx: TenantContext | null) => Promise<Response> | Response
): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const cookies = parseCookies(req.headers.get("cookie") ?? "");
    const accessToken = cookies["access_token"];

    if (!accessToken) {
      return handler(req, null);
    }

    const payload = await verifyAccessToken(accessToken);
    if (!payload) {
      return handler(req, null);
    }

    const sessionInfo = await getSessionInfo(payload.sid, payload.tid);
    if (!sessionInfo) {
      return handler(req, null);
    }

    if (sessionInfo.userId !== payload.sub || sessionInfo.tenantId !== payload.tid) {
      return handler(req, null);
    }

    const ctx: TenantContext = {
      tenantId: sessionInfo.tenantId,
      userId: sessionInfo.userId,
      sessionId: sessionInfo.sessionId,
      permissions: getPermissionsForRole(sessionInfo.role),
    };

    setTenantContext(req, ctx);

    return handler(req, ctx);
  };
}
