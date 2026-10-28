"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { SlidersHorizontal, UserPlus, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { SearchInput } from "@/components/ui/search-input";

export interface StaffFilters {
  query?: string;
  designation?: string;
  caste?: string;
  status?: string;
  employeeType?: string;
}

interface StaffFiltersBarProps {
  filters: StaffFilters;
  onChange: (filters: StaffFilters) => void;
  availableDesignations: string[];
  availableCastes: string[];
  onAddClick?: () => void;
  onExportClick?: () => void;
}

export function StaffFiltersBar({
  filters,
  onChange,
  availableDesignations,
  availableCastes,
  onAddClick,
  onExportClick,
}: StaffFiltersBarProps) {
  const [localQuery, setLocalQuery] = useState(filters.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(filters.query ?? "");
  }, [filters.query]);

  // Debounce free-text query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, query: localQuery || undefined });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  const hasActiveFilters = Boolean(
    filters.query ||
    filters.designation ||
    filters.caste ||
    filters.status
  );

  const clearAll = () => {
    setLocalQuery("");
    onChange({
      employeeType: filters.employeeType, // keep current route type
    });
  };

  return (
    <div className="space-y-3">
      {/* Search Bar & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <SearchInput value={localQuery} onChange={setLocalQuery} placeholder="Search by name, ID, mobile..." className="w-full md:max-w-md" />

        {/* Top-Right Action Buttons on Desktop & Mobile */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {onExportClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportClick}
              className="flex-1 md:flex-none h-10 rounded-xl px-3.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Report
            </Button>
          )}

          <Button
            size="sm"
            onClick={onAddClick}
            className="flex-1 md:flex-none h-10 rounded-xl px-4 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 border-t border-border/40">
        {/* Designation Filter */}
        <select
          value={filters.designation ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              designation: e.target.value || undefined,
            })
          }
          className="h-9 px-2.5 rounded-xl border border-border/80 bg-card text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer truncate w-full sm:w-auto"
        >
          <option value="">All Designations</option>
          {availableDesignations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Caste Filter */}
        <select
          value={filters.caste ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              caste: e.target.value || undefined,
            })
          }
          className="h-9 px-2.5 rounded-xl border border-border/80 bg-card text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer truncate w-full sm:w-auto"
        >
          <option value="">All Castes</option>
          {availableCastes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <CustomSelect
          value={filters.status ?? ""}
          onChange={(v: string) => onChange({
              ...filters,
              status: v || undefined,
            })}
          className="w-full sm:w-auto"
          searchable={false}
          options={[
            { value: "", label: "All Statuses" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "RETIRED", label: "Retired" },
            { value: "SUSPENDED", label: "Suspended" },
          ]}
        />

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer w-full sm:w-auto col-span-2 sm:col-span-1 justify-center"
            title="Reset all filters"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
