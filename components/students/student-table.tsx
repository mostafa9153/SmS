"use client";

import { useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Inbox,
  Loader2,
} from "lucide-react";
import type { Student } from "@/lib/types";
import { StatusBadge } from "@/components/students/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/copy-button";

interface StudentTableProps {
  data: Student[];
  total: number;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
}

export function StudentTable({
  data,
  total,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: StudentTableProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Auto-fetch next page as user scrolls near bottom
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "350px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: "slNo",
        header: "Sl. No.",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-muted-foreground/80">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Name & Welfare Tags",
        cell: ({ row }) => {
          const s = row.original;
          const age = s.dob ? currentYear - new Date(s.dob).getFullYear() : null;
          const isMinority = !!s.minorityGroup || ["Islam", "Muslim", "Christianity", "Christian", "Sikh", "Buddhist"].some(r => s.religion?.toLowerCase().includes(r.toLowerCase()));
          const isScSt = ["SC", "ST"].includes(s.socialCategory || "");

          return (
            <div className="space-y-1">
              <p className="font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer">
                {s.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Father: {s.fatherName}
                {s.altMobile && <span className="ml-1 text-[11px]">· Guardian: {s.altMobile}</span>}
              </p>
              {/* Badges */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {s.gender === "Female" && age !== null && age >= 18 && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] px-1.5 py-0 font-medium">
                    Kanyashree K2 (18+)
                  </Badge>
                )}
                {s.gender === "Female" && age !== null && age >= 13 && age < 18 && (
                  <Badge className="bg-pink-100 text-pink-800 border-pink-200 text-[10px] px-1.5 py-0 font-medium">
                    Kanyashree K1
                  </Badge>
                )}
                {isMinority && (
                  <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[10px] px-1.5 py-0 font-medium">
                    Aikyashree
                  </Badge>
                )}
                {isScSt && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0 font-medium">
                    Shikshashree
                  </Badge>
                )}
                {s.isCwsn && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] px-1.5 py-0 font-medium">
                    CWSN
                  </Badge>
                )}
                {s.isBpl && (
                  <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] px-1.5 py-0 font-medium">
                    BPL
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "schoolId",
        header: "School ID & Aadhaar",
        cell: ({ row }) => {
          const s = row.original;
          const hasAadhaar = !!s.aadhaar && s.aadhaar.trim() !== "";
          return (
            <div className="space-y-1 font-mono text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <code className="bg-muted px-1.5 py-0.5 rounded font-semibold text-foreground inline-flex items-center gap-1">
                  <span>{s.schoolId}</span>
                  <CopyButton text={s.schoolId} label="School ID" iconClassName="h-2.5 w-2.5" />
                </code>
                {hasAadhaar ? (
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] px-1.5 py-0 font-medium">
                    Aadhaar: Yes
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] px-1.5 py-0 font-medium">
                    Aadhaar: No
                  </Badge>
                )}
              </div>
              {s.pen && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span>PEN: {s.pen}</span>
                  <CopyButton text={s.pen} label="PEN" iconClassName="h-2.5 w-2.5" />
                </div>
              )}
              {s.studentUniqueCode && (
                <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
                  <span>BSP: {s.studentUniqueCode}</span>
                  <CopyButton text={s.studentUniqueCode} label="BSP ID" iconClassName="h-2.5 w-2.5" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "classSection",
        header: "Class / Section / Roll",
        cell: ({ row }) => (
          <span className="text-sm">
            Class <span className="font-bold text-foreground">{row.original.presentClass}</span> -{" "}
            <span>Sec {row.original.presentSection}</span> -{" "}
            <span className="font-bold text-primary">Roll {row.original.presentRoll}</span>
          </span>
        ),
      },
      {
        accessorKey: "currentStatus",
        header: "Status",
        cell: ({ getValue }) => (
          <StatusBadge status={getValue() as Student["currentStatus"]} />
        ),
      },
      {
        accessorKey: "admissionYear",
        header: "Adm. Year",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground font-mono">
            {getValue() as number}
          </span>
        ),
      },
    ],
    [currentYear]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading && data.length === 0) {
    return <TableSkeleton />;
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-base font-medium text-muted-foreground">
          No students found
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting your search or clearing the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground px-1">
        Showing {data.length} of {total} students
      </p>
      <div className="rounded-2xl border border-border/80 bg-card/90 overflow-x-auto shadow-xs">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/60">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider whitespace-nowrap uppercase"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/50">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/students/${row.original.id}`)}
                className="hover:bg-primary/[0.04] cursor-pointer transition-all duration-150 group"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Sentinel & Loader */}
      <div ref={sentinelRef} className="py-4 flex flex-col items-center justify-center min-h-[44px]">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading more students...</span>
          </div>
        )}
        {!isFetchingNextPage && hasNextPage && (
          <button
            onClick={() => onLoadMore?.()}
            className="text-xs font-semibold text-primary hover:underline py-1.5 px-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
          >
            Load More Students
          </button>
        )}
        {!hasNextPage && data.length > 0 && (
          <p className="text-xs text-muted-foreground/60 py-2">
            All {total} students loaded
          </p>
        )}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 border-b px-4 py-2.5 flex gap-8">
        {["Sl.", "Name", "School ID", "Class/Sec/Roll", "Status", "Adm. Year"].map(
          (h) => <Skeleton key={h} className="h-3 w-14" />
        )}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b last:border-0 px-4 py-3 flex items-center gap-8">
          <Skeleton className="h-3 w-6" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}
