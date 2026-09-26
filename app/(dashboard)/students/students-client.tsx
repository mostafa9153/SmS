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
const STORAGE_KEY = "sms_active_students_filters";

interface StudentsClientProps {
  mode?: "active" | "all";
}

function parseUrlFilters(searchParams: URLSearchParams, mode: "active" | "all"): StudentFilters | null {
  const q = searchParams.get("q") ?? undefined;
  const cls = searchParams.get("class") ?? undefined;
  const sec = searchParams.get("section") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const gender = searchParams.get("gender") ?? undefined;
  const socialCategory = searchParams.get("socialCategory") ?? undefined;
  const scheme = searchParams.get("scheme") ?? undefined;
  const hasAadhaar = searchParams.get("hasAadhaar") ?? undefined;
  const admissionYear = searchParams.get("admissionYear") ? Number(searchParams.get("admissionYear")) : undefined;
  const ageSlab = searchParams.get("ageSlab") ?? undefined;
  const semester = (searchParams.get("semester") as any) ?? undefined;

  const hasAnyParam = q !== undefined || cls !== undefined || sec !== undefined ||
    status !== undefined || gender !== undefined || socialCategory !== undefined ||
    scheme !== undefined || hasAadhaar !== undefined || admissionYear !== undefined || ageSlab !== undefined || semester !== undefined;

  if (!hasAnyParam) return null;

  return {
    query: q,
    class: cls,
    section: sec,
    status: status as any,
    gender: gender as any,
    socialCategory,
    scheme: scheme as any,
    hasAadhaar: hasAadhaar as any,
    admissionYear,
    ageSlab,
    semester,
    studentType: mode === "active" ? "active" : undefined,
  };
}

export default function StudentsClient({ mode = "active" }: StudentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial state defaults to Class V Section A (matches server prefetch)
  const [filters, setFilters] = useState<StudentFilters>(() => ({
    class: "V",
    section: "A",
    studentType: mode === "active" ? "active" : undefined,
  }));
  const [exportOpen, setExportOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore filter state on client mount from URL or sessionStorage
  useEffect(() => {
    const urlFilters = parseUrlFilters(new URLSearchParams(window.location.search), mode);
    if (urlFilters) {
      setFilters(urlFilters);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(urlFilters));
      } catch {}
    } else {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setFilters({
              ...parsed,
              studentType: mode === "active" ? "active" : undefined,
            });
          }
        }
      } catch {}
    }
    setIsInitialized(true);
  }, [mode]);

  // Sync active filters to URL search parameters & sessionStorage
  useEffect(() => {
    if (!isInitialized) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {}

    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.class) params.set("class", filters.class);
    if (filters.section) params.set("section", filters.section);
    if (filters.status) params.set("status", filters.status);
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.socialCategory) params.set("socialCategory", filters.socialCategory);
    if (filters.scheme) params.set("scheme", filters.scheme);
    if (filters.hasAadhaar) params.set("hasAadhaar", filters.hasAadhaar);
    if (filters.admissionYear) params.set("admissionYear", String(filters.admissionYear));
    if (filters.ageSlab) params.set("ageSlab", filters.ageSlab);
    if (filters.semester) params.set("semester", filters.semester);

    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [filters, isInitialized]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlFilters = parseUrlFilters(new URLSearchParams(window.location.search), mode);
      if (urlFilters) {
        setFilters(urlFilters);
      } else {
        setFilters({
          class: "V",
          section: "A",
          studentType: mode === "active" ? "active" : undefined,
        });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mode]);

  function handleFilterChange(newFilters: StudentFilters) {
    setFilters({
      ...newFilters,
      studentType: mode === "active" ? "active" : undefined,
    });
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
      !!filters.hasAadhaar ||
      !!filters.ageSlab
    );
  }, [filters]);

  return (
    <div className="flex flex-col min-h-full">
      <StudentFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        totalCount={totalCount}
        isLoading={isLoading}
        hideStatusFilter={false}
      />
      <div className="p-3.5 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.back()}
              title="Back"
              className="rounded-xl p-2 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-90 cursor-pointer border border-border/60 bg-card shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                {mode === "active" ? "Active Students Register" : "Student Directory"}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
                  hasFilters
                    ? "bg-primary/10 text-primary border-primary/25 font-bold shadow-2xs"
                    : "bg-muted/80 text-muted-foreground border-border/70"
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Counting...</span>
                  </span>
                ) : (
                  <>
                    <span className="font-mono font-bold text-xs">{totalCount.toLocaleString()}</span>
                    <span className="text-[11px] font-medium opacity-85">
                      {hasFilters ? "found" : mode === "active" ? "active" : "total"}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons: Native Phone App Stack on Mobile, Flex Row on Desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Secondary Action Grid on Mobile */}
            <div className={cn(
              "grid gap-2 w-full sm:w-auto sm:flex sm:items-center",
              filters.class ? "grid-cols-2 sm:flex" : "grid-cols-1 sm:flex"
            )}>
              {filters.class && (
                <>
                  <Link
                    href={`/generate/invoice?mode=bulk&class=${encodeURIComponent(filters.class)}${filters.section ? `&section=${encodeURIComponent(filters.section)}` : ""}`}
                    className="flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[38px] rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-2xs active:scale-95 text-center"
                    title={`Generate bulk fee invoices for Class ${filters.class}`}
                  >
                    <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="truncate">Class {filters.class} Invoices</span>
                  </Link>
                  <Link
                    href={`/generate/marksheet?mode=bulk&class=${encodeURIComponent(filters.class)}`}
                    className="flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[38px] rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-2xs active:scale-95 text-center"
                    title={`Generate bulk marksheets for Class ${filters.class}`}
                  >
                    <Award className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">Class {filters.class} Marksheets</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[38px] rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Export Report</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <Link
              href="/admission/new/ai-scan"
              className="flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] rounded-xl sm:rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 text-center shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Student</span>
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
