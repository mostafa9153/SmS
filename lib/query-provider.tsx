"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a stable QueryClient instance per component mount.
  // This pattern avoids sharing state across requests in SSR environments.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is fresh for 60 seconds — avoids re-fetching on
            // tab focus for mock data (Phase 2: tune per endpoint).
            staleTime: 60 * 1000,
            // Keep unused query data in cache for 5 minutes.
            gcTime: 5 * 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools panel (bottom-right) — auto-excluded in production builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
