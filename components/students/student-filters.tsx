"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { X, ChevronDown, Check, Users, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { getStudentFilterMetadata } from "@/lib/data/students";
import type { StudentFilters, StudentStatus } from "@/lib/types";
import { cn, sortClasses, STATUS_STYLES } from "@/lib/utils";
import { FilterSelect } from "@/components/ui/filter-select";
import { SearchInput } from "@/components/ui/search-input";

export const ACTIVE_STATUSES: StudentStatus[] = [
  "Continuing",
  "New Admission",
  "Sent Up M.P.",
  "Detained",
  "10th test fail",
  "exam fail - C.C",
  "C.C.H.S.",
  "Supplementary",
  "Compartmental",
  "Suspended",
];

export const PENDING_STATUSES: StudentStatus[] = [
  "Promoted But Not Admitted",
  "Detained",
  "Supplementary",
  "Compartmental",
  "Not Admitted",
  "Sent Up M.P.",
  "10th test fail",
  "exam fail - C.C",
  "C.C.H.S.",
];

export const OLD_STATUSES: StudentStatus[] = [
  "Passed Out",
  "Drop Out",
  "TC Out",
];

export const ALL_STATUSES: StudentStatus[] = Array.from(
  new Set([...ACTIVE_STATUSES, ...PENDING_STATUSES, ...OLD_STATUSES])
);


interface StudentFiltersBarProps {
  filters: StudentFilters;
  onChange: (filters: StudentFilters) => void;
  totalCount?: number;
  isLoading?: boolean;
  hideStatusFilter?: boolean;
}

export function StudentFiltersBar({
  filters,
  onChange,
  totalCount,
  isLoading = false,
  hideStatusFilter = false,
}: StudentFiltersBarProps) {
  const [localQuery, setLocalQuery] = useState(filters.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external query changes
  useEffect(() => {
    setLocalQuery(filters.query ?? "");
  }, [filters.query]);

  const { data: metadata } = useQuery({
    queryKey: ["student-filter-metadata"],
    queryFn: getStudentFilterMetadata,
    staleTime: 60000,
  });

  const classes = metadata?.classes?.length ? metadata.classes : ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const sections = metadata?.sections || [];
  const years = metadata?.admissionYears || [];

  // Debounce free-text query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, query: localQuery || undefined });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  function clearAll() {
    setLocalQuery("");
    onChange({});
  }

  const hasFilters =
    !!filters.query ||
    !!filters.class ||
    !!filters.section ||
    !!filters.semester ||
    !!filters.status ||
    !!filters.admissionYear ||
    !!filters.gender ||
    !!filters.socialCategory ||
    !!filters.scheme ||
    !!filters.hasAadhaar ||
    !!filters.ageSlab;

  const sortedClasses = sortClasses(classes);

  const isClassXI = filters.class === "XI";
  const isClassXII = filters.class === "XII";
  const isHS = isClassXI || isClassXII;

  const semesterOptions = useMemo(() => {
    if (isClassXI) {
      return [
        { label: "Semester 1", value: "Sem 1" },
        { label: "Semester 2", value: "Sem 2" },
      ];
    }
    if (isClassXII) {
      return [
        { label: "Semester 3", value: "Sem 3" },
        { label: "Semester 4", value: "Sem 4" },
      ];
    }
    return [
      { label: "Semester 1 (XI)", value: "Sem 1" },
      { label: "Semester 2 (XI)", value: "Sem 2" },
      { label: "Semester 3 (XII)", value: "Sem 3" },
      { label: "Semester 4 (XII)", value: "Sem 4" },
    ];
  }, [isClassXI, isClassXII]);

  const statusOptions = useMemo(() => {
    let sourceStatuses: StudentStatus[] = ALL_STATUSES;
    if (filters.studentType === "active") {
      sourceStatuses = ACTIVE_STATUSES;
    } else if (filters.studentType === "pending") {
      sourceStatuses = PENDING_STATUSES;
    } else if (filters.studentType === "old") {
      sourceStatuses = OLD_STATUSES;
    }
    return sourceStatuses.map((s) => ({
      label: STATUS_STYLES[s]?.label ?? s,
      value: s,
    }));
  }, [filters.studentType]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.class) count++;
    if (filters.section) count++;
    if (filters.semester) count++;
    if (filters.scheme) count++;
    if (filters.socialCategory) count++;
    if (filters.gender) count++;
    if (filters.status) count++;
    if (filters.admissionYear) count++;
    if (filters.hasAadhaar) count++;
    if (filters.ageSlab) count++;
    return count;
  }, [filters]);

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/80 px-3 sm:px-6 py-2 sm:py-3 shadow-2xs space-y-2">
      {/* Mobile Top Bar (<sm): Search + Filter Drawer Trigger */}
      <div className="flex sm:hidden items-center gap-2.5">
        <SearchInput value={localQuery} onChange={setLocalQuery} placeholder="Search students..." className="flex-1" />

        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer h-11 min-h-[44px]",
            activeFilterCount > 0
              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
              : "bg-card hover:bg-muted text-foreground border-border/80 shadow-2xs"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-primary text-[11px] font-black shadow-2xs">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Active Filter Badges */}
      {hasFilters && (
        <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {filters.class && (
            <span className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-primary/10 border border-primary/25 px-2.5 py-1 font-bold text-primary shrink-0 shadow-2xs">
              Class {filters.class}
              <button
                onClick={() => onChange({ ...filters, class: undefined, section: undefined, semester: undefined })}
                className="p-1 rounded-md hover:bg-primary/20 active:scale-90 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {filters.section && (
            <span className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-primary/10 border border-primary/25 px-2.5 py-1 font-bold text-primary shrink-0 shadow-2xs">
              Sec {filters.section}
              <button
                onClick={() => onChange({ ...filters, section: undefined })}
                className="p-1 rounded-md hover:bg-primary/20 active:scale-90 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {filters.semester && (
            <span className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-primary/10 border border-primary/25 px-2.5 py-1 font-bold text-primary shrink-0 shadow-2xs">
              {filters.semester}
              <button
                onClick={() => onChange({ ...filters, semester: undefined })}
                className="p-1 rounded-md hover:bg-primary/20 active:scale-90 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-primary/10 border border-primary/25 px-2.5 py-1 font-bold text-primary shrink-0 shadow-2xs">
              {STATUS_STYLES[filters.status]?.label ?? filters.status}
              <button
                onClick={() => onChange({ ...filters, status: undefined })}
                className="p-1 rounded-md hover:bg-primary/20 active:scale-90 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {filters.scheme && (
            <span className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-primary/10 border border-primary/25 px-2.5 py-1 font-bold text-primary shrink-0 shadow-2xs">
              Scheme: {filters.scheme}
              <button
                onClick={() => onChange({ ...filters, scheme: undefined })}
                className="p-1 rounded-md hover:bg-primary/20 active:scale-90 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {filters.gender && (
            <span className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-primary/10 border border-primary/25 px-2.5 py-1 font-bold text-primary shrink-0 shadow-2xs">
              {filters.gender}
              <button
                onClick={() => onChange({ ...filters, gender: undefined })}
                className="p-1 rounded-md hover:bg-primary/20 active:scale-90 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          <button
            onClick={clearAll}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 active:scale-95 shrink-0 px-2 py-1 bg-rose-500/10 rounded-xl border border-rose-500/20"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Mobile Filter Sheet Drawer */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-[2.25rem] p-5 overflow-y-auto space-y-4 border-t border-border shadow-2xl pb-safe">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2" />
          <SheetHeader className="p-0 flex flex-row items-center justify-between border-b pb-3 text-left">
            <SheetTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filter Students
            </SheetTitle>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-bold text-rose-500 hover:underline cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-500/10 active:scale-95"
              >
                Reset all
              </button>
            )}
          </SheetHeader>

          {/* Quick Touch Class Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Select Class</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ ...filters, class: undefined, section: undefined, semester: undefined })}
                className={cn(
                  "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                  !filters.class
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                All
              </button>
              {sortedClasses.map((c) => {
                const isSelected = filters.class === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      const nextClass = isSelected ? undefined : c;
                      const nextIsHS = nextClass === "XI" || nextClass === "XII";
                      onChange({
                        ...filters,
                        class: nextClass,
                        section: undefined,
                        semester: nextIsHS ? filters.semester : undefined,
                      });
                    }}
                    className={cn(
                      "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border/80 text-foreground hover:bg-muted"
                    )}
                  >
                    Class {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Touch Section Pills */}
          {sections.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Section</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, section: undefined })}
                  className={cn(
                    "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                    !filters.section
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  All
                </button>
                {sections.map((s) => {
                  const isSelected = filters.section === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChange({ ...filters, section: isSelected ? undefined : s })}
                      className={cn(
                        "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/80 text-foreground hover:bg-muted"
                      )}
                    >
                      Sec {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Touch Semester Pills (for Class XI / XII or All) */}
          {(!filters.class || isHS) && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Semester (HS)</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, semester: undefined })}
                  className={cn(
                    "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                    !filters.semester
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  All
                </button>
                {semesterOptions.map((sem) => {
                  const isSelected = filters.semester === sem.value;
                  return (
                    <button
                      key={sem.value}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...filters,
                          semester: isSelected ? undefined : (sem.value as any),
                        })
                      }
                      className={cn(
                        "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/80 text-foreground hover:bg-muted"
                      )}
                    >
                      {sem.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Welfare Scheme</label>
              <FilterSelect
                value={filters.scheme ?? ""}
                onChange={(v) => onChange({ ...filters, scheme: (v as any) || undefined })}
                placeholder="Welfare Scheme"
                allLabel="All Schemes"
                options={[
                  { label: "🎀 Kanyashree (All)", value: "kanyashree" },
                  { label: "🎀 Kanyashree K1 (Class 8-11)", value: "kanyashree_k1" },
                  { label: "🎓 Kanyashree K2 (Class 12 / 18+)", value: "kanyashree_k2" },
                  { label: "📘 Sikshashree (SC/ST V-VIII)", value: "sikshashree" },
                  { label: "🏛️ OASIS Pre-Matric (SC/ST/OBC IX-X)", value: "oasis_pre" },
                  { label: "🏛️ OASIS Post-Matric (SC/ST/OBC XI-XII)", value: "oasis_post" },
                  { label: "📗 Pre-Matric NSP (Muslim IX-X)", value: "nsp_pre" },
                  { label: "📗 Post-Matric NSP (Muslim XI-XII)", value: "nsp_post" },
                  { label: "📗 NSP (Minority 9-12)", value: "nsp" },
                  { label: "⭐ SVMCM (Muslim XI-XII, 60%+)", value: "svmcm" },
                  { label: "🚲 Sarathi (Bicycle IX)", value: "sabooj_sathi" },
                  { label: "♿ CWSN / Divyangjan", value: "cwsn" },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <FilterSelect
                value={filters.socialCategory ?? ""}
                onChange={(v) => onChange({ ...filters, socialCategory: (v as any) || undefined })}
                placeholder="Category"
                allLabel="All Categories"
                options={[
                  { label: "General", value: "General" },
                  { label: "OBC", value: "OBC" },
                  { label: "SC", value: "SC" },
                  { label: "ST", value: "ST" },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Gender</label>
              <FilterSelect
                value={filters.gender ?? ""}
                onChange={(v) => onChange({ ...filters, gender: (v as any) || undefined })}
                placeholder="Gender"
                allLabel="All Genders"
                options={[
                  { label: "Female", value: "Female" },
                  { label: "Male", value: "Male" },
                  { label: "Other", value: "Other" },
                ]}
              />
            </div>

            {!hideStatusFilter && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                <FilterSelect
                  value={filters.status ?? ""}
                  onChange={(v) => onChange({ ...filters, status: (v as StudentStatus) || undefined })}
                  placeholder="Status"
                  allLabel="All Statuses"
                  options={statusOptions}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Adm. Year</label>
              <FilterSelect
                value={filters.admissionYear ? String(filters.admissionYear) : ""}
                onChange={(v) => onChange({ ...filters, admissionYear: v ? Number(v) : undefined })}
                placeholder="Adm. Year"
                allLabel="All Years"
                options={years.map((y) => ({ label: String(y), value: String(y) }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Aadhaar</label>
              <FilterSelect
                value={filters.hasAadhaar ?? ""}
                onChange={(v) => onChange({ ...filters, hasAadhaar: (v as "yes" | "no") || undefined })}
                placeholder="Aadhaar"
                allLabel="All Students"
                options={[
                  { label: "Aadhaar: Yes", value: "yes" },
                  { label: "Aadhaar: No", value: "no" },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Age Group</label>
              <FilterSelect
                value={filters.ageSlab ?? ""}
                onChange={(v) => onChange({ ...filters, ageSlab: v || undefined })}
                placeholder="Age Group"
                allLabel="All Ages"
                options={[
                  { label: "🎂 Below 10", value: "below_10" },
                  { label: "🎂 10 - 11", value: "10_11" },
                  { label: "🎂 11 - 12", value: "11_12" },
                  { label: "🎂 12 - 13", value: "12_13" },
                  { label: "🎂 13 - 14", value: "13_14" },
                  { label: "🎂 14 - 15", value: "14_15" },
                  { label: "🎂 15 - 16", value: "15_16" },
                  { label: "🎂 16 - 17", value: "16_17" },
                  { label: "🎂 17 - 18", value: "17_18" },
                  { label: "🎂 18 - 19", value: "18_19" },
                  { label: "🎂 19 - 20", value: "19_20" },
                  { label: "🎂 20+ yrs", value: "20_above" },
                ]}
              />
            </div>
          </div>

          <div className="pt-2 sticky bottom-0 bg-background pb-2">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full h-12 min-h-[48px] rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Apply Filters</span>
              {totalCount !== undefined && <span className="opacity-90 font-mono font-normal text-xs">({totalCount} students)</span>}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Filter Bar (hidden on mobile, visible sm+) */}
      <div className="hidden sm:flex flex-wrap gap-2 items-center">
        {/* Smart search */}
        <SearchInput value={localQuery} onChange={setLocalQuery} placeholder="Search name, ID, PEN, Aadhaar…" size="sm" className="min-w-[170px] flex-1 max-w-xs" />

        {/* Class filter */}
        <FilterSelect
          value={filters.class ?? ""}
          onChange={(v) => {
            const nextClass = v || undefined;
            const nextIsHS = nextClass === "XI" || nextClass === "XII";
            onChange({
              ...filters,
              class: nextClass,
              section: undefined,
              semester: nextIsHS ? filters.semester : undefined,
            });
          }}
          placeholder="Class"
          allLabel="All Classes"
          options={sortedClasses.map((c) => ({ label: `Class ${c}`, value: c }))}
        />

        {/* Section filter */}
        <FilterSelect
          value={filters.section ?? ""}
          onChange={(v) => onChange({ ...filters, section: v || undefined })}
          placeholder="Section"
          allLabel="All Sections"
          options={sections.map((s) => ({ label: `Section ${s}`, value: s }))}
        />

        {/* Semester filter (HS) */}
        {(!filters.class || isHS) && (
          <FilterSelect
            value={filters.semester ?? ""}
            onChange={(v) => onChange({ ...filters, semester: (v as any) || undefined })}
            placeholder="Semester"
            allLabel="All Semesters"
            options={semesterOptions}
          />
        )}

        {/* Welfare Scheme filter */}
        <FilterSelect
          value={filters.scheme ?? ""}
          onChange={(v) => onChange({ ...filters, scheme: (v as any) || undefined })}
          placeholder="Welfare Scheme"
          allLabel="All Schemes"
          options={[
            { label: "🎀 Kanyashree (All)", value: "kanyashree" },
            { label: "🎀 Kanyashree K1 (Class 8-11)", value: "kanyashree_k1" },
            { label: "🎓 Kanyashree K2 (Class 12 / 18+)", value: "kanyashree_k2" },
            { label: "📘 Sikshashree (SC/ST V-VIII)", value: "sikshashree" },
            { label: "🏛️ OASIS Pre-Matric (SC/ST/OBC IX-X)", value: "oasis_pre" },
            { label: "🏛️ OASIS Post-Matric (SC/ST/OBC XI-XII)", value: "oasis_post" },
            { label: "📗 Pre-Matric NSP (Muslim IX-X)", value: "nsp_pre" },
            { label: "📗 Post-Matric NSP (Muslim XI-XII)", value: "nsp_post" },
            { label: "📗 NSP (Minority 9-12)", value: "nsp" },
            { label: "⭐ SVMCM (Muslim XI-XII, 60%+)", value: "svmcm" },
            { label: "🚲 Sarathi (Bicycle IX)", value: "sabooj_sathi" },
            { label: "♿ CWSN / Divyangjan", value: "cwsn" },
          ]}
        />

        {/* Social Category */}
        <FilterSelect
          value={filters.socialCategory ?? ""}
          onChange={(v) => onChange({ ...filters, socialCategory: (v as any) || undefined })}
          placeholder="Category"
          allLabel="All Categories"
          options={[
            { label: "General", value: "General" },
            { label: "OBC", value: "OBC" },
            { label: "SC", value: "SC" },
            { label: "ST", value: "ST" },
          ]}
        />

        {/* Gender */}
        <FilterSelect
          value={filters.gender ?? ""}
          onChange={(v) => onChange({ ...filters, gender: (v as any) || undefined })}
          placeholder="Gender"
          allLabel="All Genders"
          options={[
            { label: "Female", value: "Female" },
            { label: "Male", value: "Male" },
            { label: "Other", value: "Other" },
          ]}
        />

        {/* Status filter */}
        {!hideStatusFilter && (
          <FilterSelect
            value={filters.status ?? ""}
            onChange={(v) =>
              onChange({ ...filters, status: (v as StudentStatus) || undefined })
            }
            placeholder="Status"
            allLabel="All Statuses"
            options={statusOptions}
          />
        )}

        {/* Admission year filter */}
        <FilterSelect
          value={filters.admissionYear ? String(filters.admissionYear) : ""}
          onChange={(v) =>
            onChange({
              ...filters,
              admissionYear: v ? Number(v) : undefined,
            })
          }
          placeholder="Adm. Year"
          allLabel="All Years"
          options={years.map((y) => ({ label: String(y), value: String(y) }))}
        />

        {/* Aadhaar (Yes / No) filter */}
        <FilterSelect
          value={filters.hasAadhaar ?? ""}
          onChange={(v) =>
            onChange({
              ...filters,
              hasAadhaar: (v as "yes" | "no") || undefined,
            })
          }
          placeholder="Aadhaar"
          allLabel="All Students"
          options={[
            { label: "Aadhaar: Yes", value: "yes" },
            { label: "Aadhaar: No", value: "no" },
          ]}
        />

        {/* Age Group / Slab filter */}
        <FilterSelect
          value={filters.ageSlab ?? ""}
          onChange={(v) =>
            onChange({
              ...filters,
              ageSlab: v || undefined,
            })
          }
          placeholder="Age Group"
          allLabel="All Ages"
          options={[
            { label: "🎂 Below 10 yrs", value: "below_10" },
            { label: "🎂 10 - 11 yrs", value: "10_11" },
            { label: "🎂 11 - 12 yrs", value: "11_12" },
            { label: "🎂 12 - 13 yrs", value: "12_13" },
            { label: "🎂 13 - 14 yrs", value: "13_14" },
            { label: "🎂 14 - 15 yrs", value: "14_15" },
            { label: "🎂 15 - 16 yrs", value: "15_16" },
            { label: "🎂 16 - 17 yrs", value: "16_17" },
            { label: "🎂 17 - 18 yrs", value: "17_18" },
            { label: "🎂 18 - 19 yrs", value: "18_19" },
            { label: "🎂 19 - 20 yrs", value: "19_20" },
            { label: "🎂 20+ yrs (Above 20)", value: "20_above" },
          ]}
        />

        {/* Clear filters button */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Clear all active filters"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear filters</span>
          </button>
        )}
      </div>
    </div>
  );
}

