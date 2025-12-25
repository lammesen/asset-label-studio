import { SignJWT, jwtVerify } from "jose";
import { hash, verify } from "@node-rs/argon2";

import type { AccessTokenPayload, RefreshTokenPayload } from "@/types/user";
import type { Role } from "@/types/permissions";

const MIN_SECRET_LENGTH = 32;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  return value;
}

function initSecrets(): { access: Uint8Array; refresh: Uint8Array } {
  if (process.env.NODE_ENV === "test") {
    return {
      access: new TextEncoder().encode("test-access-secret-minimum-32-chars!"),
      refresh: new TextEncoder().encode("test-refresh-secret-minimum-32-chars"),
    };
  }
  
  return {
    access: new TextEncoder().encode(getRequiredEnv("ACCESS_TOKEN_SECRET")),
    refresh: new TextEncoder().encode(getRequiredEnv("REFRESH_TOKEN_SECRET")),
  };
}

let secrets: { access: Uint8Array; refresh: Uint8Array } | null = null;

function getSecrets() {
  if (!secrets) {
    secrets = initSecrets();
  }
  return secrets;
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
export const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

// Centralized cookie path constants - MUST be used consistently for set and clear
export const COOKIE_PATHS = {
  ACCESS_TOKEN: "/",
  REFRESH_TOKEN: "/api/auth/refresh",
} as const;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function createAccessToken(payload: {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: Role;
}): Promise<string> {
  const { access } = getSecrets();
  return new SignJWT({
    sub: payload.userId,
    tid: payload.tenantId,
    sid: payload.sessionId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(access);
}

export async function createRefreshToken(payload: {
  userId: string;
  tenantId: string;
  sessionId: string;
}): Promise<string> {
  const { refresh } = getSecrets();
  return new SignJWT({
    sub: payload.userId,
    tid: payload.tenantId,
    sid: payload.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(refresh);
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { access } = getSecrets();
    const { payload } = await jwtVerify(token, access);
    return {
      sub: payload.sub as string,
      tid: payload.tid as string,
      sid: payload.sid as string,
      role: payload.role as Role,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { refresh } = getSecrets();
    const { payload } = await jwtVerify(token, refresh);
    return {
      sub: payload.sub as string,
      tid: payload.tid as string,
      sid: payload.sid as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function hashTokenSHA256(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
  path: string;
  maxAge: number;
}

export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "Strict",
    path: COOKIE_PATHS.ACCESS_TOKEN,
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS,
  };
}

export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "Strict",
    path: COOKIE_PATHS.REFRESH_TOKEN,
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
  };
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite}`);
  parts.push(`Path=${options.path}`);
  parts.push(`Max-Age=${options.maxAge}`);

  return parts.join("; ");
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      if (key) {
        try {
          cookies[key] = decodeURIComponent(value);
        } catch {
          cookies[key] = value;
        }
      }
    }
  }

  return cookies;
}

export function serializeClearCookie(name: string, path: string): string {
  const parts = [`${name}=`, `Path=${path}`, "Max-Age=0", "HttpOnly", "SameSite=Strict"];
  if (IS_PRODUCTION) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function createMultiCookieHeaders(cookies: string[]): Headers {
  const headers = new Headers();
  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }
  return headers;
}
