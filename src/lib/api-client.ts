const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const CSRF_HEADER = "X-Requested-With";
export const CSRF_HEADER_VALUE = "XMLHttpRequest";

export interface ApiFetchOptions extends Omit<RequestInit, "credentials"> {
  skipCsrf?: boolean;
}

export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { skipCsrf = false, headers: customHeaders, ...rest } = options;
  
  const headers = new Headers(customHeaders);
  
  if (!skipCsrf && rest.method && UNSAFE_METHODS.has(rest.method.toUpperCase())) {
    headers.set(CSRF_HEADER, CSRF_HEADER_VALUE);
  }
  
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...rest,
    headers,
    credentials: "include",
  });
}

export async function apiGet(url: string): Promise<Response> {
  return apiFetch(url, { method: "GET" });
}

export async function apiPost<T>(url: string, body?: T): Promise<Response> {
  return apiFetch(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(url: string, body?: T): Promise<Response> {
  return apiFetch(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(url: string): Promise<Response> {
  return apiFetch(url, { method: "DELETE" });
}
