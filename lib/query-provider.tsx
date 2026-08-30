"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a stable QueryClient instance per component mount.
  // This pattern avoids sharing state across requests in SSR environments.
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
