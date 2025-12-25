import { sql } from "drizzle-orm";
import { db } from "@/db";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimitDb(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowSeconds = Math.ceil(config.windowMs / 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSeconds / windowSeconds);
  const resetAt = (bucket + 1) * windowSeconds * 1000;

  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, bucket, count)
    VALUES (${key}, ${bucket}, 1)
    ON CONFLICT (key, bucket)
    DO UPDATE SET
      count = rate_limits.count + 1,
      updated_at = now()
    RETURNING count
  `);

  const rows = result as unknown as Array<{ count: number }>;
  const count = Number(rows[0]?.count ?? 1);
  const allowed = count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);

  return { allowed, remaining, resetAt };
}

export const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
};

export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
};

export const PRINT_JOB_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
};

export const PRINT_RENDER_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 5,
};

export const PRINT_PREVIEW_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 20,
};

export const WEBHOOK_RETRY_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
};

export const IMPORT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 5,
};

export const EXPORT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
};

export const WEBHOOK_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 20,
};

export type RouteHandler = (req: Request) => Promise<Response> | Response;

export function withRateLimit(
  config: RateLimitConfig,
  handler: RouteHandler
): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const ip = getClientIdentifier(req);
    const url = new URL(req.url);
    const key = `${ip}:${url.pathname}`;
    
    const result = await checkRateLimitDb(key, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(config.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
          },
        }
      );
    }
    
    const response = await handler(req);
    
    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Limit", String(config.maxRequests));
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export function withLoginRateLimit(
  handler: RouteHandler,
  getEmailFromRequest?: (req: Request) => Promise<string | null>
): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const ip = getClientIdentifier(req);
    const ipKey = `login:ip:${ip}`;
    
    const ipResult = await checkRateLimitDb(ipKey, LOGIN_RATE_LIMIT);
    if (!ipResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many login attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((ipResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }
    
    if (getEmailFromRequest) {
      try {
        const clonedReq = req.clone();
        const email = await getEmailFromRequest(clonedReq);
        if (email) {
          const emailKey = `login:email:${email.toLowerCase()}`;
          const emailResult = await checkRateLimitDb(emailKey, LOGIN_RATE_LIMIT);
          if (!emailResult.allowed) {
            return new Response(
              JSON.stringify({ error: "Too many login attempts for this account. Please try again later." }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String(Math.ceil((emailResult.resetAt - Date.now()) / 1000)),
                },
              }
            );
          }
        }
      } catch {}
    }
    
    return handler(req);
  };
}
