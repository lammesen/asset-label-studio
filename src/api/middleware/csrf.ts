import type { RouteHandler } from "./auth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const ALLOWED_ORIGINS = new Set([
  process.env.APP_ORIGIN,
  process.env.APP_URL,
].filter(Boolean));

export const CSRF_HEADER = "X-Requested-With";
export const CSRF_HEADER_VALUE = "XMLHttpRequest";

function normalizeOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function getRequestOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin) return normalizeOrigin(origin);
  
  const referer = req.headers.get("referer");
  if (referer) return normalizeOrigin(referer);
  
  return null;
}

function isAllowedOrigin(origin: string | null, req: Request): boolean {
  if (!origin) {
    return false;
  }

  if (ALLOWED_ORIGINS.size > 0 && ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  const requestUrl = new URL(req.url);
  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
  
  return origin === requestOrigin;
}

function hasValidCsrfHeader(req: Request): boolean {
  const headerValue = req.headers.get(CSRF_HEADER);
  return headerValue === CSRF_HEADER_VALUE;
}

export function withCsrfProtection(handler: RouteHandler): RouteHandler {
  return async (req: Request): Promise<Response> => {
    if (SAFE_METHODS.has(req.method)) {
      return handler(req);
    }

    const origin = getRequestOrigin(req);
    const hasValidOrigin = isAllowedOrigin(origin, req);
    const hasValidHeader = hasValidCsrfHeader(req);
    
    if (!hasValidOrigin && !hasValidHeader) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return handler(req);
  };
}

export function withCsrfProtectionForApiKey(handler: RouteHandler): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const hasApiKey = req.headers.has("x-api-key");
    if (hasApiKey) {
      return handler(req);
    }

    return withCsrfProtection(handler)(req);
  };
}
