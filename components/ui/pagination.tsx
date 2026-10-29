"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Prev / next bar for a paged list. Renders nothing when there is one page, unless `alwaysShow`
 * (keeps the record count visible).
 * With `total` + `pageSize` the left side reads "a–b of total"; otherwise "Page x of y".
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  disabled,
  alwaysShow,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
  disabled?: boolean;
  alwaysShow?: boolean;
  className?: string;
}) {
  if (totalPages <= 1 && !alwaysShow) return null;
  const range =
    total != null && pageSize && total > 0
      ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
      : `Page ${page} of ${totalPages}`;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-2 p-3 text-xs text-muted-foreground", className)}
    >
      <span>{range}</span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="px-1.5 font-mono font-bold text-foreground tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}
