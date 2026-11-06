"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import type { MyBooks } from "./db-library-my";
import { libraryWrite, useRefreshLibrary } from "./use-catalog";

export function useMyBooks() {
  return useQuery<MyBooks>({
    queryKey: ["library", "my"],
    queryFn: () => apiFetch<MyBooks>("/api/library/my"),
    // "today" is fixed when fetched; refetching on focus keeps due badges right past midnight.
    refetchOnWindowFocus: "always",
  });
}

/** The "My books" page: my books plus renew. */
export function useMyBooksPage() {
  const books = useMyBooks();
  const refresh = useRefreshLibrary();
  const [busy, setBusy] = useState<string | null>(null);

  const renew = async (loanId: string, title: string) => {
    setBusy(loanId);
    try {
      const r = await libraryWrite<{ dueOn: string }>("/api/library/my/renew", "POST", { loanId });
      toastWithUndo(`${title}: new due ${r.data.dueOn}`, r.undoId, refresh);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Renew failed");
    } finally {
      setBusy(null);
    }
  };

  return { books, busy, renew };
}
