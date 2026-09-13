"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Search, X, ChevronDown, Check, Users, Loader2, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { getStudentFilterMetadata } from "@/lib/data/students";
import type { StudentFilters, StudentStatus } from "@/lib/types";
import { cn, sortClasses } from "@/lib/utils";

const STATUSES: StudentStatus[] = [
  "Continuing",
  "Drop Out",
  "Passed Out",
  "Sent Up M.P.",
  "C.C.H.S.",
];

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
    !!filters.status ||
    !!filters.admissionYear ||
    !!filters.gender ||
    !!filters.socialCategory ||
    !!filters.scheme ||
    !!filters.hasAadhaar ||
    !!filters.ageSlab;

  const sortedClasses = sortClasses(classes);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.class) count++;
    if (filters.section) count++;
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
      <div className="flex sm:hidden items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search students..."
            className="w-full rounded-xl border border-border/90 bg-card hover:bg-background pl-9 pr-3 py-2 text-base font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs placeholder:text-muted-foreground/70"
          />
          {localQuery && (
            <button
              onClick={() => setLocalQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer min-h-[40px]",
            activeFilterCount > 0
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-card hover:bg-muted text-foreground border-border"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-background text-primary text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Active Filter Badges */}
      {hasFilters && (
        <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {filters.class && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 font-semibold text-primary shrink-0">
              Class {filters.class}
              <button onClick={() => onChange({ ...filters, class: undefined, section: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.section && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 font-semibold text-primary shrink-0">
              Sec {filters.section}
              <button onClick={() => onChange({ ...filters, section: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 font-semibold text-primary shrink-0">
              {filters.status}
              <button onClick={() => onChange({ ...filters, status: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.scheme && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 font-semibold text-primary shrink-0">
              Scheme: {filters.scheme}
              <button onClick={() => onChange({ ...filters, scheme: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.gender && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 font-semibold text-primary shrink-0">
              {filters.gender}
              <button onClick={() => onChange({ ...filters, gender: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAll}
            className="text-[11px] font-bold text-rose-500 hover:underline shrink-0 px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Mobile Filter Sheet Drawer */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-5 overflow-y-auto space-y-4 border-t border-border shadow-2xl">
          <SheetHeader className="p-0 flex flex-row items-center justify-between border-b pb-3">
            <SheetTitle className="text-base font-bold">Filter Students</SheetTitle>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Reset all
              </button>
            )}
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Class</label>
              <FilterSelect
                value={filters.class ?? ""}
                onChange={(v) => onChange({ ...filters, class: v || undefined, section: undefined })}
                placeholder="Class"
                options={sortedClasses.map((c) => ({ label: `Class ${c}`, value: c }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Section</label>
              <FilterSelect
                value={filters.section ?? ""}
                onChange={(v) => onChange({ ...filters, section: v || undefined })}
                placeholder="Section"
                options={sections.map((s) => ({ label: `Section ${s}`, value: s }))}
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Welfare Scheme</label>
              <FilterSelect
                value={filters.scheme ?? ""}
                onChange={(v) => onChange({ ...filters, scheme: (v as any) || undefined })}
                placeholder="Welfare Scheme"
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
                  options={STATUSES.map((s) => ({ label: s, value: s }))}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Adm. Year</label>
              <FilterSelect
                value={filters.admissionYear ? String(filters.admissionYear) : ""}
                onChange={(v) => onChange({ ...filters, admissionYear: v ? Number(v) : undefined })}
                placeholder="Adm. Year"
                options={years.map((y) => ({ label: String(y), value: String(y) }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Aadhaar</label>
              <FilterSelect
                value={filters.hasAadhaar ?? ""}
                onChange={(v) => onChange({ ...filters, hasAadhaar: (v as "yes" | "no") || undefined })}
                placeholder="Aadhaar"
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

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Apply Filters</span>
              {totalCount !== undefined && <span className="opacity-80 font-normal">({totalCount} students)</span>}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Filter Bar (hidden on mobile, visible sm+) */}
      <div className="hidden sm:flex flex-wrap gap-2 items-center">
        {/* Smart search */}
        <div className="relative min-w-[170px] flex-1 max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search name, ID, PEN, Aadhaar…"
            className="w-full rounded-xl border border-border/90 hover:border-primary/40 bg-card hover:bg-background pl-9 pr-3 py-1.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary focus:bg-background transition-all shadow-2xs placeholder:text-muted-foreground/70"
          />
        </div>

        {/* Class filter */}
        <FilterSelect
          value={filters.class ?? ""}
          onChange={(v) => onChange({ ...filters, class: v || undefined, section: undefined })}
          placeholder="Class"
          options={sortedClasses.map((c) => ({ label: `Class ${c}`, value: c }))}
        />

        {/* Section filter */}
        <FilterSelect
          value={filters.section ?? ""}
          onChange={(v) => onChange({ ...filters, section: v || undefined })}
          placeholder="Section"
          options={sections.map((s) => ({ label: `Section ${s}`, value: s }))}
        />

        {/* Welfare Scheme filter */}
        <FilterSelect
          value={filters.scheme ?? ""}
          onChange={(v) => onChange({ ...filters, scheme: (v as any) || undefined })}
          placeholder="Welfare Scheme"
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
            options={STATUSES.map((s) => ({ label: s, value: s }))}
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const isAgeGroup = placeholder === "Age Group";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 outline-none select-none cursor-pointer shadow-2xs",
          value
            ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30 shadow-xs"
            : "border-border/90 bg-card hover:bg-background text-foreground/80 hover:text-foreground hover:border-primary/40 hover:shadow-xs",
          isOpen && "ring-2 ring-primary/25 border-primary shadow-xs"
        )}
      >
        <span className="truncate max-w-[140px]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 shrink-0",
            isOpen ? "rotate-180 text-primary" : value ? "text-primary" : "text-muted-foreground/80"
          )}
        />
      </button>

      {/* Floating Animated Menu — Solid opaque background to prevent background bleed-through */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-[240px] sm:w-[270px] rounded-2xl border border-border/90 bg-card dark:bg-slate-900 bg-white p-2 shadow-2xl z-[100] animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 mb-1.5 border-b border-border/60 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 rounded-xl">
            <span className="flex items-center gap-1.5">
              {isAgeGroup && <span>🎂</span>}
              <span>{placeholder}</span>
            </span>
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-rose-500 hover:text-rose-600 font-semibold hover:underline capitalize text-[11px] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1 [::-webkit-scrollbar]:w-1.5 [::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [::-webkit-scrollbar-thumb]:rounded-full [::-webkit-scrollbar-track]:bg-transparent">
            {/* All / Default option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-all duration-150 cursor-pointer",
                !value
                  ? "bg-primary/15 text-primary font-bold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{placeholder === "Class" ? "All Classes" : `All ${placeholder}s`}</span>
              {!value && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>

            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-all duration-150 cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
