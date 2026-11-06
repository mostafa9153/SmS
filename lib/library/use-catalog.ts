"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { BookDetail, BookListItem, BookRow, CatalogStats } from "./db-library";
import { newRequestId } from "./request-id";

/** One key tree for every library query, so a write can refresh them all. */
export const libraryKeys = {
  all: ["library"] as const,
  books: (q: string) => ["library", "books", q] as const,
  book: (id: string) => ["library", "book", id] as const,
  stats: () => ["library", "stats"] as const,
  duplicates: (title: string, author: string) => ["library", "duplicates", title, author] as const,
};

export const BOOK_PAGE = 50;

/** Catalog pages of 50, sorted by title; `fetchNextPage` loads the next 50. */
export function useBooks(q: string) {
  return useInfiniteQuery({
    queryKey: libraryKeys.books(q),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiFetch<BookListItem[]>(`/api/library/books?q=${encodeURIComponent(q)}&limit=${BOOK_PAGE}&offset=${pageParam}`),
    getNextPageParam: (last, pages) => (last.length < BOOK_PAGE ? undefined : pages.length * BOOK_PAGE),
    placeholderData: (prev) => prev,
  });
}

export function useBook(id: string) {
  return useQuery<BookDetail>({
    queryKey: libraryKeys.book(id),
    queryFn: () => apiFetch<BookDetail>(`/api/library/books/${id}`),
    enabled: Boolean(id),
  });
}

export function useCatalogStats() {
  return useQuery<CatalogStats>({
    queryKey: libraryKeys.stats(),
    queryFn: () => apiFetch<CatalogStats>("/api/library/stats"),
  });
}

/** K1: titles a new entry would duplicate; asks only once the title is long enough. */
export function useDuplicateBooks(title: string, author: string) {
  const t = title.trim();
  const a = author.trim();
  return useQuery<BookRow[]>({
    queryKey: libraryKeys.duplicates(t, a),
    queryFn: () => apiFetch<BookRow[]>(`/api/library/books/duplicates?title=${encodeURIComponent(t)}&author=${encodeURIComponent(a)}`),
    enabled: t.length >= 2,
    staleTime: 30_000,
  });
}

export function useRefreshLibrary() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: libraryKeys.all });
}

export interface LibraryWriteResult<T> {
  data: T;
  undoId: string | null;
}

/**
 * A library write; returns data and undoId for toastWithUndo. Pass the same
 * `requestId` when retrying one user action, so a write that committed but
 * lost its answer is not applied twice (D8).
 */
export function libraryWrite<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown> = {},
  requestId: string = newRequestId(),
) {
  return apiFetch<{ data: T; undoId: string | null }>(url, {
    method,
    json: { requestId, ...body },
    raw: true,
  }).then((r) => ({ data: r.data, undoId: r.undoId ?? null }) as LibraryWriteResult<T>);
}

export const COPY_STATUS_META = {
  shelf: { label: "Shelf-এ", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  loan: { label: "ধার দেওয়া", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  lost: { label: "হারানো", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
} as const;

export function copyState(copy: { status: string; onLoan: boolean }): keyof typeof COPY_STATUS_META {
  if (copy.onLoan) return "loan";
  if (copy.status === "lost") return "lost";
  if (copy.status === "withdrawn") return "withdrawn";
  return "shelf";
}
