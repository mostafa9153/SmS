"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getDistinctClasses,
  getDistinctSections,
  getDistinctAdmissionYears,
} from "@/lib/data/students";
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
}

export function StudentFiltersBar({ filters, onChange }: StudentFiltersBarProps) {
  const [localQuery, setLocalQuery] = useState(filters.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["distinct-classes"],
    queryFn: getDistinctClasses,
    staleTime: Infinity,
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["distinct-sections"],
    queryFn: getDistinctSections,
    staleTime: Infinity,
  });
  const { data: years = [] } = useQuery({
    queryKey: ["distinct-years"],
    queryFn: getDistinctAdmissionYears,
    staleTime: Infinity,
  });

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
    !!filters.hasAadhaar;

  const sortedClasses = sortClasses(classes);

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-6 py-3 shadow-xs">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Smart search */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search name, ID, PEN, Aadhaar…"
            className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-colors"
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
            { label: "Kanyashree (All)", value: "kanyashree" },
            { label: "Kanyashree K1 (13-17)", value: "kanyashree_k1" },
            { label: "Kanyashree K2 (18+)", value: "kanyashree_k2" },
            { label: "Aikyashree (Minority)", value: "aikyashree" },
            { label: "Shikshashree (SC/ST)", value: "shikshashree" },
            { label: "CWSN", value: "cwsn" },
            { label: "BPL Beneficiary", value: "bpl" },
          ]}
        />

        {/* Social Category */}
        <FilterSelect
          value={filters.socialCategory ?? ""}
          onChange={(v) => onChange({ ...filters, socialCategory: (v as any) || undefined })}
          placeholder="Category"
          options={[
            { label: "General", value: "General" },
            { label: "SC", value: "SC" },
            { label: "ST", value: "ST" },
            { label: "OBC-A", value: "OBC-A" },
            { label: "OBC-B", value: "OBC-B" },
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
        <FilterSelect
          value={filters.status ?? ""}
          onChange={(v) =>
            onChange({ ...filters, status: (v as StudentStatus) || undefined })
          }
          placeholder="Status"
          options={STATUSES.map((s) => ({ label: s, value: s }))}
        />

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

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filters
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
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none rounded-md border bg-background pl-3 pr-7 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-colors cursor-pointer",
          value ? "text-foreground font-medium border-primary/50 bg-primary/5" : "text-muted-foreground"
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
