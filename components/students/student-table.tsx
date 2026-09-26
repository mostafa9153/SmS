"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  ChevronRight,
} from "lucide-react";
import type { Student } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/copy-button";
import { evaluateStudentScholarships } from "@/lib/utils/welfare-logic";
import { cn, calculateExactAge, calculateDetailedAge } from "@/lib/utils";
import { StudentRoundAvatar } from "@/components/students/student-round-avatar";
import { StudentPhotoPreviewDialog } from "@/components/students/student-photo-preview-dialog";
import { StatusBadge } from "@/components/students/status-badge";

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
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
}: StudentTableProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

  // Infinite scroll trigger
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
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
        id: "photo",
        header: "Photo",
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div
              data-prevent-row-click="true"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewStudent(s);
              }}
              className="flex items-center justify-center py-0.5"
            >
              <button
                type="button"
                data-prevent-row-click="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewStudent(s);
                }}
                className="group/avatar relative rounded-full p-0.5 transition-all cursor-pointer hover:ring-3 hover:ring-primary/40 active:scale-95"
                title={`Click to view enlarged photo of ${s.name}`}
              >
                <StudentRoundAvatar
                  name={s.name}
                  photoUrl={s.photoUrl}
                  size="xl"
                  className="transition-transform duration-200 group-hover/avatar:scale-105 shadow-md"
                />
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name & Welfare Tags",
        cell: ({ row }) => {
          const s = row.original;
          const { eligibleSchemes } = evaluateStudentScholarships(s);

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer">
                  {s.name}
                </p>
                <CopyButton text={s.name} label="Student Name" iconClassName="h-2.5 w-2.5" />
                <StatusBadge status={s.currentStatus || "Continuing"} size="sm" />
                {s.detentionCount && s.detentionCount > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                    Repeater ({s.detentionCount}x)
                  </span>
                ) : null}
                {s.presentSemester && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {s.presentSemester}
                  </span>
                )}
                {s.dob && (
                  <span
                    className="inline-flex items-center gap-1 font-mono text-[11px] bg-muted/80 text-foreground px-1.5 py-0.5 rounded-md border border-border/50"
                    title={(() => {
                      const dAge = calculateDetailedAge(s.dob);
                      return dAge ? `Exact Age: ${dAge.formattedLong}` : undefined;
                    })()}
                  >
                    <span>
                      DOB: {s.dob}
                      {(() => {
                        const dAge = calculateDetailedAge(s.dob);
                        return dAge ? ` (${dAge.formattedShort})` : "";
                      })()}
                    </span>
                    <CopyButton text={s.dob} label="Date of Birth" iconClassName="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                <span>Father: {s.fatherName}</span>
                {(s.altMobile || s.studentContact) && (
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <span>· Guardian: {s.altMobile || s.studentContact}</span>
                    <CopyButton
                      text={s.altMobile || s.studentContact || ""}
                      label="Phone Number"
                      iconClassName="h-2.5 w-2.5"
                    />
                  </span>
                )}
              </p>
              {/* Welfare Badges */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {eligibleSchemes.slice(0, 4).map((scheme) => (
                  <span
                    key={scheme.id}
                    className={`inline-flex items-center border text-[10px] px-1.5 py-0 rounded-md font-semibold font-mono ${scheme.colorBadge}`}
                    title={`${scheme.name} (${scheme.amount})`}
                  >
                    {scheme.shortCode}
                  </span>
                ))}
                {eligibleSchemes.length > 4 && (
                  <span className="inline-flex items-center border bg-muted/60 text-muted-foreground text-[10px] px-1.5 py-0 rounded-md font-mono">
                    +{eligibleSchemes.length - 4} more
                  </span>
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
        cell: ({ row }) => {
          const s = row.original;
          const sessionYear = s.academicYear || s.admissionYear;
          return (
            <div className="space-y-0.5">
              <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                <span>
                  Class <span className="font-bold text-foreground">{s.presentClass}</span>
                </span>
                {s.presentSemester && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-bold">
                    {s.presentSemester}
                  </span>
                )}
                <span>- Sec {s.presentSection} -</span>
                <span className="font-bold text-primary">Roll {s.presentRoll}</span>
              </div>
              {sessionYear && (
                <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground/80">Session:</span>
                  <span className="font-semibold text-foreground">{sessionYear}</span>
                </div>
              )}
            </div>
          );
        },
      },

      {
        id: "action",
        header: "",
        cell: ({ row }) => {
          const isNavigating = navigatingId === row.original.id;
          return (
            <div className="flex items-center justify-end pr-1">
              {isNavigating ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Opening...</span>
                </span>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200">
                  <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    View
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        },
      },
    ],
    [currentYear, navigatingId]
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
      {/* Mobile Stacked Cards View (<md) */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {data.map((student) => {
          const isNavigating = navigatingId === student.id;
          const { eligibleSchemes } = evaluateStudentScholarships(student);
          const hasAadhaar = !!student.aadhaar && student.aadhaar.trim() !== "";
          const dAge = student.dob ? calculateDetailedAge(student.dob) : null;

          return (
            <div
              key={student.id}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("button") || target.closest("a") || target.closest("[data-prevent-row-click]")) {
                  return;
                }
                setNavigatingId(student.id);
                router.push(`/students/${student.id}`);
              }}
              className={cn(
                "rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition-all active:scale-[0.99] cursor-pointer space-y-2.5 select-none",
                isNavigating ? "bg-primary/10 border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
              )}
            >
              {/* Top Row: Avatar + Name + Chevron */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-prevent-row-click="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewStudent(student);
                  }}
                  className="group/avatar relative rounded-full p-0.5 border border-transparent hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer shrink-0"
                  title={`Click to view enlarged photo of ${student.name}`}
                >
                  <StudentRoundAvatar
                    name={student.name}
                    photoUrl={student.photoUrl}
                    size="lg"
                    className="transition-transform group-hover/avatar:scale-105"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-foreground truncate">
                      {student.name}
                    </p>
                    <CopyButton text={student.name} label="Name" iconClassName="h-2.5 w-2.5" />
                  </div>
                  <div className="text-xs font-semibold text-primary mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>Class {student.presentClass}</span>
                    {student.presentSemester && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-bold">
                        {student.presentSemester}
                      </span>
                    )}
                    <span>· Sec {student.presentSection} · Roll {student.presentRoll}</span>
                  </div>
                </div>
                <div className="flex items-center shrink-0">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Middle Row: ID, Aadhaar, DOB */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-muted/40 p-2 rounded-xl border border-border/40">
                <div className="flex items-center gap-1 truncate">
                  <span className="text-muted-foreground font-sans">ID:</span>
                  <span className="font-bold text-foreground truncate">{student.schoolId}</span>
                  <CopyButton text={student.schoolId} label="ID" iconClassName="h-2.5 w-2.5" />
                </div>
                <div className="flex items-center gap-1 justify-end font-sans">
                  <span className="text-muted-foreground">Aadhaar:</span>
                  {hasAadhaar ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Yes</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-bold">No</span>
                  )}
                </div>
                {student.dob && (
                  <div className="flex items-center gap-1 col-span-2 text-muted-foreground font-sans text-[11px]">
                    <span>DOB: {student.dob}</span>
                    {dAge && <span className="text-foreground/80 font-medium">({dAge.formattedShort})</span>}
                  </div>
                )}
                {(student.altMobile || student.studentContact) && (
                  <div className="flex items-center gap-1 col-span-2 text-[11px] font-sans text-muted-foreground">
                    <span>Phone: {student.altMobile || student.studentContact}</span>
                    <CopyButton text={student.altMobile || student.studentContact || ""} label="Phone" iconClassName="h-2.5 w-2.5" />
                  </div>
                )}
              </div>

              {/* Welfare Schemes Badges */}
              {eligibleSchemes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {eligibleSchemes.slice(0, 3).map((scheme) => (
                    <span
                      key={scheme.id}
                      className={cn("inline-flex items-center border text-[9px] px-1.5 py-0.5 rounded-md font-semibold font-mono", scheme.colorBadge)}
                    >
                      {scheme.shortCode}
                    </span>
                  ))}
                  {eligibleSchemes.length > 3 && (
                    <span className="inline-flex items-center border bg-muted/60 text-muted-foreground text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                      +{eligibleSchemes.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Data Table (hidden on mobile, visible md+) */}
      <div className="hidden md:block rounded-2xl border border-border/80 bg-card/90 overflow-x-auto shadow-xs">
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
            {table.getRowModel().rows.map((row) => {
              const isNavigating = navigatingId === row.original.id;
              return (
                <tr
                  key={row.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("button") || target.closest("a") || target.closest("[data-prevent-row-click]")) {
                      return;
                    }
                    setNavigatingId(row.original.id);
                    router.push(`/students/${row.original.id}`);
                  }}
                  className={cn(
                    "relative cursor-pointer transition-all duration-150 group select-none",
                    "hover:bg-primary/[0.06] dark:hover:bg-primary/10",
                    "active:scale-[0.996] active:bg-primary/15",
                    isNavigating
                      ? "bg-primary/10 border-l-4 border-l-primary shadow-xs font-medium"
                      : "border-l-4 border-l-transparent"
                  )}
                  title={`Click to open ${row.original.name}'s full profile`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
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

      {/* Student Photo Preview Pop-up Dialog */}
      <StudentPhotoPreviewDialog
        student={previewStudent}
        isOpen={!!previewStudent}
        onClose={() => setPreviewStudent(null)}
        onPhotoUpdated={(studentId, newUrl) => {
          const s = data.find((st) => st.id === studentId);
          if (s) {
            s.photoUrl = newUrl;
          }
        }}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 border-b px-4 py-2.5 flex gap-8">
        {["Sl.", "Photo", "Name", "School ID", "Class/Sec/Roll"].map(
          (h) => <Skeleton key={h} className="h-3 w-14" />
        )}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b last:border-0 px-4 py-3 flex items-center gap-6">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
