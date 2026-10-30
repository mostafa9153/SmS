"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { reportClientError } from "@/lib/notifications/client-events";

// Signed-out / forbidden responses are expected (session expiry, hidden modules); not bell-worthy.
function shouldReport(error: unknown) {
  if (error instanceof ApiError) return error.status !== 401 && error.status !== 403;
  return !(error instanceof Error && /^(unauthori[sz]ed|forbidden)\b/i.test(error.message));
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a stable QueryClient instance per component mount.
  // This pattern avoids sharing state across requests in SSR environments.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (shouldReport(error) && !query.meta?.silent) reportClientError("Failed to load data", error);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            if (shouldReport(error) && !mutation.meta?.silent) reportClientError("Action failed", error);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 3 * 60 * 1000, // 3 minutes cache
            gcTime: 15 * 60 * 1000,   // 15 minutes garbage collection
            refetchOnWindowFocus: false, // Prevents sudden lags on window focus
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
