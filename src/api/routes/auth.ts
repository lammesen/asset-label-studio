import { z } from "zod";

import {
  serializeCookie,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  parseCookies,
  serializeClearCookie,
} from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenant";
import { login, refreshSession, logout, getUserById } from "@/services/auth-service";
import { withAuth } from "@/api/middleware/auth";

import type { TenantContext } from "@/types/tenant";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1),
});

function createAuthCookieHeaders(accessCookie: string, refreshCookie: string): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.append("Set-Cookie", accessCookie);
  headers.append("Set-Cookie", refreshCookie);
  return headers;
}

function createClearCookieHeaders(): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.append("Set-Cookie", serializeClearCookie("access_token", "/"));
  headers.append("Set-Cookie", serializeClearCookie("refresh_token", "/api/auth"));
  return headers;
}

export async function handleLogin(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, tenantSlug } = parsed.data;

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant || !tenant.isActive) {
      return Response.json({ error: "Invalid tenant" }, { status: 400 });
    }

    const result = await login(tenant.id, { email, password }, req);
    if (!result) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { user, tokens } = result;

    const accessCookie = serializeCookie(
      "access_token",
      tokens.accessToken,
      getAccessTokenCookieOptions()
    );
    const refreshCookie = serializeCookie(
      "refresh_token",
      tokens.refreshToken,
      getRefreshTokenCookieOptions()
    );

    const headers = createAuthCookieHeaders(accessCookie, refreshCookie);

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function handleRefresh(req: Request): Promise<Response> {
  try {
    const cookies = parseCookies(req.headers.get("cookie") ?? "");
    const refreshToken = cookies["refresh_token"];

    if (!refreshToken) {
      return Response.json({ error: "No refresh token" }, { status: 401 });
    }

    const tokens = await refreshSession(refreshToken, req);
    if (!tokens) {
      return new Response(
        JSON.stringify({ error: "Invalid refresh token" }),
        { status: 401, headers: createClearCookieHeaders() }
      );
    }

    const accessCookie = serializeCookie(
      "access_token",
      tokens.accessToken,
      getAccessTokenCookieOptions()
    );
    const refreshCookie = serializeCookie(
      "refresh_token",
      tokens.refreshToken,
      getRefreshTokenCookieOptions()
    );

    const headers = createAuthCookieHeaders(accessCookie, refreshCookie);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Refresh error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const handleLogout = withAuth(
  async (_req: Request, ctx: TenantContext): Promise<Response> => {
    try {
      await logout(ctx.sessionId, ctx.tenantId, ctx.userId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: createClearCookieHeaders() }
      );
    } catch (error) {
      console.error("Logout error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);

export const handleGetMe = withAuth(
  async (_req: Request, ctx: TenantContext): Promise<Response> => {
    try {
      const user = await getUserById(ctx.userId, ctx.tenantId);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        permissions: ctx.permissions,
      });
    } catch (error) {
      console.error("Get me error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);
