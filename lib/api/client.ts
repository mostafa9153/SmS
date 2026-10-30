// Browser-side fetch helper for our `{ success, data | error }` API routes.
// Throws ApiError on HTTP or envelope failure; those errors reach the
// notification bell through the QueryClient caches (see lib/query-provider.tsx).

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly url: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || payload?.success === false) {
    const message = payload?.error || payload?.message || `${res.status} ${res.statusText}`.trim();
    throw new ApiError(message, res.status, url);
  }
  return (payload?.data ?? payload) as T;
}
