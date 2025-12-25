interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpiredEntries();
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }
  
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count += 1;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
};

export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
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
    
    const result = checkRateLimit(key, config);
    
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
    
    const ipResult = checkRateLimit(ipKey, LOGIN_RATE_LIMIT);
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
          const emailResult = checkRateLimit(emailKey, LOGIN_RATE_LIMIT);
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
