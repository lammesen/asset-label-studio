import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";

import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashTokenSHA256,
  REFRESH_TOKEN_EXPIRY_SECONDS,
} from "@/lib/auth";
import { withTenant } from "@/lib/tenant";
import { logAuthEvent, createAuditLog } from "./audit-service";
import { AUDIT_ACTIONS } from "@/types/audit";

const CONSUMED_TOKEN_PREFIX = "CONSUMED:";

import type { LoginCredentials, User, CreateUserInput } from "@/types/user";
import type { Role } from "@/types/permissions";
import type { TenantContext } from "@/types/tenant";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  tenantId: string;
  role: Role;
}

export async function login(
  tenantId: string,
  credentials: LoginCredentials,
  req?: Request
): Promise<{ user: User; tokens: AuthTokens } | null> {
  const userRow = await withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenantId),
          eq(schema.users.email, credentials.email.toLowerCase()),
          eq(schema.users.isActive, true)
        )
      )
      .limit(1);
    return row;
  });

  if (!userRow) {
    await logAuthEvent(tenantId, null, AUDIT_ACTIONS.LOGIN_FAILED, {
      reason: "invalid_credentials",
    }, req);
    return null;
  }

  const passwordValid = await verifyPassword(userRow.passwordHash, credentials.password);
  if (!passwordValid) {
    await logAuthEvent(tenantId, userRow.id, AUDIT_ACTIONS.LOGIN_FAILED, {
      reason: "invalid_credentials",
    }, req);
    return null;
  }

  const tokens = await createSession(userRow.id, tenantId, userRow.role as Role, req);

  await withTenant(tenantId, async (tx) => {
    await tx
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, userRow.id));
  });

  await logAuthEvent(tenantId, userRow.id, AUDIT_ACTIONS.LOGIN, {}, req);

  const user: User = {
    id: userRow.id,
    tenantId: userRow.tenantId,
    email: userRow.email,
    name: userRow.name,
    role: userRow.role as Role,
    isActive: userRow.isActive,
    lastLoginAt: userRow.lastLoginAt,
    createdAt: userRow.createdAt,
    updatedAt: userRow.updatedAt,
  };

  return { user, tokens };
}

export async function createSession(
  userId: string,
  tenantId: string,
  role: Role,
  req?: Request
): Promise<AuthTokens> {
  const sessionId = crypto.randomUUID();
  const refreshToken = await createRefreshToken({ userId, tenantId, sessionId });
  const accessToken = await createAccessToken({ userId, tenantId, sessionId, role });

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  const refreshTokenHash = await hashTokenSHA256(refreshToken);
  
  await withTenant(tenantId, async (tx) => {
    await tx.insert(schema.sessions).values({
      id: sessionId,
      userId,
      tenantId,
      refreshTokenHash,
      userAgent: req?.headers.get("user-agent") ?? null,
      ipAddress: getClientIP(req) ?? null,
      expiresAt,
    });
  });

  return { accessToken, refreshToken };
}

export async function refreshSession(
  refreshToken: string,
  req?: Request
): Promise<AuthTokens | null> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }

  const tenantId = payload.tid;
  const tokenHash = await hashTokenSHA256(refreshToken);
  const consumedMarker = `${CONSUMED_TOKEN_PREFIX}${Date.now()}`;

  const atomicResult = await withTenant(tenantId, async (tx) => {
    const updated = await tx
      .update(schema.sessions)
      .set({ refreshTokenHash: consumedMarker })
      .where(and(
        eq(schema.sessions.id, payload.sid),
        eq(schema.sessions.tenantId, tenantId),
        eq(schema.sessions.refreshTokenHash, tokenHash),
        sql`${schema.sessions.expiresAt} > NOW()`,
        sql`${schema.sessions.refreshTokenHash} NOT LIKE 'CONSUMED:%'`
      ))
      .returning({
        id: schema.sessions.id,
        userId: schema.sessions.userId,
      });

    if (updated.length === 0) {
      const [existingSession] = await tx
        .select({
          id: schema.sessions.id,
          userId: schema.sessions.userId,
          refreshTokenHash: schema.sessions.refreshTokenHash,
          expiresAt: schema.sessions.expiresAt,
        })
        .from(schema.sessions)
        .where(and(
          eq(schema.sessions.id, payload.sid),
          eq(schema.sessions.tenantId, tenantId)
        ))
        .limit(1);

      if (existingSession?.refreshTokenHash.startsWith(CONSUMED_TOKEN_PREFIX)) {
        return { reuse: true, userId: existingSession.userId };
      }

      if (existingSession && existingSession.expiresAt < new Date()) {
        await tx.delete(schema.sessions).where(eq(schema.sessions.id, existingSession.id));
      }

      return { reuse: false, userId: null };
    }

    return { reuse: false, userId: updated[0]!.userId, sessionConsumed: true };
  });

  if (atomicResult.reuse && atomicResult.userId) {
    await handleTokenReuse(atomicResult.userId, tenantId, req);
    return null;
  }

  if (!atomicResult.userId) {
    return null;
  }

  const user = await withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.users)
      .where(and(
        eq(schema.users.id, atomicResult.userId!),
        eq(schema.users.tenantId, tenantId)
      ))
      .limit(1);
    return row;
  });

  if (!user || !user.isActive) {
    return null;
  }

  const tokens = await createSession(user.id, tenantId, user.role as Role, req);

  await logAuthEvent(tenantId, user.id, AUDIT_ACTIONS.TOKEN_REFRESHED, {}, req);

  return tokens;
}

async function handleTokenReuse(
  userId: string,
  tenantId: string,
  req?: Request
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx.delete(schema.sessions).where(and(
      eq(schema.sessions.userId, userId),
      eq(schema.sessions.tenantId, tenantId)
    ));
  });

  await logAuthEvent(tenantId, userId, AUDIT_ACTIONS.TOKEN_REUSE_DETECTED, {
    action: "all_sessions_invalidated",
    clientIp: getClientIP(req),
    userAgent: req?.headers.get("user-agent"),
  }, req);

  console.error(
    `[SECURITY] Refresh token reuse detected for user ${userId} in tenant ${tenantId}. All sessions invalidated.`
  );
}

export async function logout(sessionId: string, tenantId: string, userId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx.delete(schema.sessions).where(and(
      eq(schema.sessions.id, sessionId),
      eq(schema.sessions.tenantId, tenantId)
    ));
  });
  await logAuthEvent(tenantId, userId, AUDIT_ACTIONS.LOGOUT, {});
}

export async function logoutAllSessions(userId: string, tenantId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx.delete(schema.sessions).where(and(
      eq(schema.sessions.userId, userId),
      eq(schema.sessions.tenantId, tenantId)
    ));
  });
  await logAuthEvent(tenantId, userId, AUDIT_ACTIONS.LOGOUT, { allSessions: true });
}

export async function createUser(
  ctx: TenantContext,
  input: CreateUserInput
): Promise<User> {
  const passwordHash = await hashPassword(input.password);

  return withTenant(ctx.tenantId, async (tx) => {
    const [newUser] = await tx
      .insert(schema.users)
      .values({
        tenantId: ctx.tenantId,
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        role: input.role,
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    return {
      id: newUser.id,
      tenantId: newUser.tenantId,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as Role,
      isActive: newUser.isActive,
      lastLoginAt: newUser.lastLoginAt,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
  });
}

export async function getUserById(userId: string, tenantId: string): Promise<User | null> {
  return withTenant(tenantId, async (tx) => {
    const [user] = await tx
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.tenantId, tenantId)))
      .limit(1);

    if (!user) return null;

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });
}

export async function getSessionInfo(sessionId: string, tenantId: string): Promise<SessionInfo | null> {
  return withTenant(tenantId, async (tx) => {
    const [session] = await tx
      .select()
      .from(schema.sessions)
      .where(and(
        eq(schema.sessions.id, sessionId),
        eq(schema.sessions.tenantId, tenantId)
      ))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const [user] = await tx
      .select()
      .from(schema.users)
      .where(and(
        eq(schema.users.id, session.userId),
        eq(schema.users.tenantId, tenantId)
      ))
      .limit(1);

    if (!user || !user.isActive) {
      return null;
    }

    return {
      sessionId: session.id,
      userId: user.id,
      tenantId: session.tenantId,
      role: user.role as Role,
    };
  });
}

function getClientIP(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0];
    return first ? first.trim() : null;
  }
  return req.headers.get("x-real-ip");
}
