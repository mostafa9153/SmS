// Browser-side fetch helper for our `{ success, data | error }` API routes.
// Throws ApiError on HTTP or envelope failure; those errors reach the
// notification bell through the QueryClient caches (see lib/query-provider.tsx).

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly url: string) {
    super(message);
    this.name = "ApiError";
  }
}

// `raw: true` returns the whole payload instead of unwrapping `data` (for bodies that carry
// `student`, `undoId`, `pagination` or other siblings next to it).
export async function apiFetch<T = unknown>(url: string, init?: RequestInit & { json?: unknown; raw?: boolean }): Promise<T> {
  const { json, raw, headers, ...rest } = init ?? {};
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
  return (raw ? payload : payload?.data ?? payload) as T;
}
