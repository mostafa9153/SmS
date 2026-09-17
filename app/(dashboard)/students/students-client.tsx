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

  const hasAnyParam = q !== undefined || cls !== undefined || sec !== undefined ||
    status !== undefined || gender !== undefined || socialCategory !== undefined ||
    scheme !== undefined || hasAadhaar !== undefined || admissionYear !== undefined || ageSlab !== undefined;

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
        hideStatusFilter={mode === "active"}
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
              <h1 className="text-lg font-bold tracking-tight">
                {mode === "active" ? "Active Students Register" : "Student Directory"}
              </h1>
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
                      {hasFilters ? "students found" : mode === "active" ? "active students" : "total students"}
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
