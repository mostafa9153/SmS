"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center font-sans">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-6 shadow-lg shadow-destructive/5 animate-pulse">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        {error?.message || "An unexpected application error occurred while processing your request."}
      </p>

      {error?.digest && (
        <p className="mt-2 text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-md">
          Digest: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          className="gap-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-md"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/")}
          className="gap-2 rounded-xl"
        >
          <Home className="h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
