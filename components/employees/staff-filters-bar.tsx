"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Search, X, SlidersHorizontal, UserPlus, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      {/* Top Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, ID, mobile..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-xl bg-card/80 border-border/80 text-sm focus-visible:ring-primary/20"
          />
          {localQuery && (
            <button
              onClick={() => setLocalQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Dropdowns & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Designation Filter */}
          <select
            value={filters.designation ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                designation: e.target.value || undefined,
              })
            }
            className="h-10 px-3 rounded-xl border border-border/80 bg-card/80 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
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
            className="h-10 px-3 rounded-xl border border-border/80 bg-card/80 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="">All Castes</option>
            {availableCastes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                status: e.target.value || undefined,
              })
            }
            className="h-10 px-3 rounded-xl border border-border/80 bg-card/80 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="RETIRED">Retired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-10 px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {onExportClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportClick}
                className="h-10 rounded-xl px-3.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Report
              </Button>
            )}

            <Button
              size="sm"
              onClick={onAddClick}
              className="h-10 rounded-xl px-4 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
