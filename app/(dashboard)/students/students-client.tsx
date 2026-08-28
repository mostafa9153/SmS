"use client";

import { useState, useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { searchStudents } from "@/lib/data/students";
import type { StudentFilters } from "@/lib/types";
import { StudentFiltersBar } from "@/components/students/student-filters";
import { StudentTable } from "@/components/students/student-table";
import { ExportDialog } from "@/components/students/export-dialog";
import { FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 20;

export default function StudentsClient() {
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

  return (
    <div className="flex flex-col min-h-full">
      <StudentFiltersBar filters={filters} onChange={handleFilterChange} />
      <div className="p-3.5 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Student Directory</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
