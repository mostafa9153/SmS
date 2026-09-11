"use client";

import { useState, useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { searchStudents } from "@/lib/data/students";
import type { StudentFilters } from "@/lib/types";
import { StudentFiltersBar } from "@/components/students/student-filters";
import { StudentTable } from "@/components/students/student-table";
import { ExportDialog } from "@/components/students/export-dialog";
import { FileSpreadsheet, Plus, ArrowLeft, FileText, Award, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function StudentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? undefined;

  const [filters, setFilters] = useState<StudentFilters>({
    query: initialQuery,
  });
  const [exportOpen, setExportOpen] = useState(false);

  // Sync URL search parameter changes
  const queryParam = searchParams.get("q") || "";
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      query: queryParam || undefined,
    }));
  }, [queryParam]);

  function handleFilterChange(newFilters: StudentFilters) {
    setFilters(newFilters);
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["students-infinite", filters],
    queryFn: ({ pageParam = 1 }) => searchStudents(filters, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.meta) return undefined;
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
  });

  const allStudents = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );
  const totalCount = data?.pages[0]?.meta.total ?? 0;

  const hasFilters = useMemo(() => {
    return (
      !!filters.query ||
      !!filters.class ||
      !!filters.section ||
      !!filters.status ||
      !!filters.admissionYear ||
      !!filters.gender ||
      !!filters.socialCategory ||
      !!filters.scheme ||
      !!filters.hasAadhaar
    );
  }, [filters]);

  return (
    <div className="flex flex-col min-h-full">
      <StudentFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        totalCount={totalCount}
        isLoading={isLoading}
      />
      <div className="p-3.5 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              title="Back"
              className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight">Student Directory</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-200",
                  hasFilters
                    ? "bg-primary/10 text-primary border-primary/25 font-bold shadow-2xs"
                    : "bg-muted/80 text-muted-foreground border-border"
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Counting...</span>
                  </span>
                ) : (
                  <>
                    <span className="font-mono text-xs">{totalCount.toLocaleString()}</span>
                    <span className="text-[11px] font-medium opacity-85">
                      {hasFilters ? (totalCount === 1 ? "found" : "found") : "students"}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.class && (
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/generate/invoice?mode=bulk&class=${encodeURIComponent(filters.class)}${filters.section ? `&section=${encodeURIComponent(filters.section)}` : ""}`}
                  className="flex items-center gap-1 rounded-xl border bg-card px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
                  title={`Generate bulk fee invoices for Class ${filters.class}`}
                >
                  <FileText className="h-3.5 w-3.5 text-teal-600" />
                  <span>Class {filters.class} Invoices</span>
                </Link>
                <Link
                  href={`/generate/marksheet?mode=bulk&class=${encodeURIComponent(filters.class)}`}
                  className="flex items-center gap-1 rounded-xl border bg-card px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
                  title={`Generate bulk marksheets for Class ${filters.class}`}
                >
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  <span>Class {filters.class} Marksheets</span>
                </Link>
              </div>
            )}
            <button
              onClick={() => setExportOpen(true)}
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Report
            </button>
            <Link
              href="/students/add"
              className="flex-1 sm:flex-none justify-center flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Student
            </Link>
          </div>
        </div>

        <StudentTable
          data={allStudents}
          total={totalCount}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onLoadMore={fetchNextPage}
        />
      </div>

      {/* Export Report Modal */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        activeFilters={filters}
      />
    </div>
  );
}
