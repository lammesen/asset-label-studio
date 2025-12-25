import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";

import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashTokenSHA256,
  REFRESH_TOKEN_EXPIRY_SECONDS,
} from "@/lib/auth";
import { logAuthEvent } from "./audit-service";
import { AUDIT_ACTIONS } from "@/types/audit";

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
  const [userRow] = await db
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

  if (!userRow) {
    await logAuthEvent(tenantId, null, AUDIT_ACTIONS.LOGIN_FAILED, {
      email: credentials.email,
      reason: "user_not_found",
    }, req);
    return null;
  }

  const passwordValid = await verifyPassword(userRow.passwordHash, credentials.password);
  if (!passwordValid) {
    await logAuthEvent(tenantId, userRow.id, AUDIT_ACTIONS.LOGIN_FAILED, {
      reason: "invalid_password",
    }, req);
    return null;
  }

  const tokens = await createSession(userRow.id, tenantId, userRow.role as Role, req);

  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, userRow.id));

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
  const refreshToken = await createRefreshToken({ userId, sessionId });
  const accessToken = await createAccessToken({ userId, tenantId, sessionId, role });

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  const refreshTokenHash = await hashTokenSHA256(refreshToken);
  
  await db.insert(schema.sessions).values({
    id: sessionId,
    userId,
    tenantId,
    refreshTokenHash,
    userAgent: req?.headers.get("user-agent") ?? null,
    ipAddress: getClientIP(req) ?? null,
    expiresAt,
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

  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, payload.sid))
    .limit(1);

  if (!session) {
    return null;
  }

  const tokenHash = await hashTokenSHA256(refreshToken);
  if (session.refreshTokenHash !== tokenHash) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
    return null;
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  if (!user || !user.isActive) {
    return null;
  }

  await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));

  const tokens = await createSession(user.id, session.tenantId, user.role as Role, req);

  await logAuthEvent(session.tenantId, user.id, AUDIT_ACTIONS.TOKEN_REFRESHED, {}, req);

  return tokens;
}

export async function logout(sessionId: string, tenantId: string, userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  await logAuthEvent(tenantId, userId, AUDIT_ACTIONS.LOGOUT, {});
}

export async function logoutAllSessions(userId: string, tenantId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  await logAuthEvent(tenantId, userId, AUDIT_ACTIONS.LOGOUT, { allSessions: true });
}

export async function createUser(
  ctx: TenantContext,
  input: CreateUserInput
): Promise<User> {
  const passwordHash = await hashPassword(input.password);

  const [newUser] = await db
    .insert(schema.users)
    .values({
      tenantId: ctx.tenantId,
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      role: input.role,
    })
    .returning();

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
}

export async function getUserById(userId: string, tenantId: string): Promise<User | null> {
  const [user] = await db
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
}

export async function getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
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
}

function getClientIP(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip");
}
