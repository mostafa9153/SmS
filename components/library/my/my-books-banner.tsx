"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyBooks } from "@/lib/library/use-my-books";

/**
 * T-d: opening the portal shows late or soon-due library books right here
 * (no cron or bell). Nothing shows for an account with no staff profile or no loans.
 */
export function MyBooksBanner() {
  const { data } = useMyBooks();
  if (!data?.linked || data.loans.length === 0) return null;
  const late = data.overdue > 0;
  return (
    <Link
      href="/teacher/library"
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
        late
          ? "border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400"
          : data.dueSoon > 0
            ? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
            : "border-border/80 bg-card text-foreground hover:bg-muted/50",
      )}
    >
      <BookOpen className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {late ? `${data.overdue} book(s) overdue` : data.dueSoon > 0 ? `${data.dueSoon} book(s) due soon` : `My books (${data.loans.length})`}
      </span>
      {late && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white tabular-nums">{data.overdue}</span>}
    </Link>
  );
}
