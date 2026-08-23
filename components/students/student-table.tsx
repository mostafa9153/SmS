"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import type { Student } from "@/lib/types";
import { StatusBadge } from "@/components/students/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StudentTableProps {
  data: Student[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function StudentTable({
  data,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading,
}: StudentTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const currentYear = new Date().getFullYear();

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
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
                <code className="bg-muted px-1.5 py-0.5 rounded font-semibold text-foreground">
                  {s.schoolId}
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
                <div className="text-[11px] text-muted-foreground">
                  PEN: {s.pen}
                </div>
              )}
              {s.studentUniqueCode && (
                <div className="text-[10px] text-muted-foreground/80">
                  BSP: {s.studentUniqueCode}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "classSection",
        header: "Class / Section / Roll",
        enableSorting: false,
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
        enableSorting: false,
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
    state: { sorting, pagination: { pageIndex: page - 1, pageSize } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
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
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}{" "}
        of {total} students
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
                    {header.isPlaceholder ? null : (
                      <button
                        className={cn(
                          "flex items-center gap-1.5",
                          header.column.getCanSort() &&
                            "cursor-pointer select-none hover:text-foreground transition-colors"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="text-muted-foreground/50">
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-primary" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5 text-primary" />
                            ) : null}
                          </span>
                        )}
                      </button>
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

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-1 py-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - page) <= 1
              )
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1)
                  acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => onPageChange(p as number)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-95",
                      p === page
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 border-b px-4 py-2.5 flex gap-8">
        {["Name", "School ID", "Class/Sec/Roll", "Status", "Adm. Year"].map(
          (h) => <Skeleton key={h} className="h-3 w-16" />
        )}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b last:border-0 px-4 py-3 flex items-center gap-8">
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
