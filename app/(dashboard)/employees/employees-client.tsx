"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Users, Loader2, Sparkles, UserPlus } from "lucide-react";
import { StaffFiltersBar, StaffFilters } from "@/components/employees/staff-filters-bar";
import { StaffStatsCards } from "@/components/employees/staff-stats-cards";
import { StaffTable, StaffProfile } from "@/components/employees/staff-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmployeesClientProps {
  initialStaff: StaffProfile[];
  initialType?: string;
}

export default function EmployeesClient({
  initialStaff,
  initialType,
}: EmployeesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || initialType || "";

  const [filters, setFilters] = useState<StaffFilters>({
    employeeType: typeParam || undefined,
  });

  // Sync URL parameter changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      employeeType: typeParam || undefined,
    }));
  }, [typeParam]);

  // Extract unique filter options from initial data
  const availableDesignations = useMemo(() => {
    const set = new Set<string>();
    initialStaff.forEach((s) => {
      if (s.designation) set.add(s.designation);
    });
    return Array.from(set).sort();
  }, [initialStaff]);

  const availableCastes = useMemo(() => {
    const set = new Set<string>();
    initialStaff.forEach((s) => {
      if (s.caste) set.add(s.caste);
    });
    return Array.from(set).sort();
  }, [initialStaff]);

  // Filtered dataset
  const filteredStaff = useMemo(() => {
    return initialStaff.filter((staff) => {
      // 1. Employee Type filter
      if (filters.employeeType === "teaching" && staff.employee_type !== "TEACHING") {
        return false;
      }
      if (filters.employeeType === "non-teaching" && staff.employee_type !== "NON_TEACHING") {
        return false;
      }

      // 2. Search query (name, unique_id, mobile, designation)
      if (filters.query && filters.query.trim() !== "") {
        const q = filters.query.toLowerCase().trim();
        const matchesName = staff.full_name?.toLowerCase().includes(q);
        const matchesId = staff.unique_id?.toLowerCase().includes(q);
        const matchesMobile = staff.mobile?.toLowerCase().includes(q);
        const matchesDesig = staff.designation?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesMobile && !matchesDesig) {
          return false;
        }
      }

      // 3. Designation filter
      if (filters.designation && staff.designation !== filters.designation) {
        return false;
      }

      // 4. Caste filter
      if (filters.caste && staff.caste !== filters.caste) {
        return false;
      }

      // 5. Status filter
      if (filters.status && staff.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [initialStaff, filters]);

  // Compute metric stats
  const stats = useMemo(() => {
    let teaching = 0;
    let nonTeaching = 0;
    let active = 0;

    initialStaff.forEach((s) => {
      if (s.employee_type === "TEACHING") teaching++;
      if (s.employee_type === "NON_TEACHING") nonTeaching++;
      if (s.status === "ACTIVE") active++;
    });

    return {
      total: initialStaff.length,
      teachingCount: teaching,
      nonTeachingCount: nonTeaching,
      activeCount: active,
    };
  }, [initialStaff]);

  // Export to Excel handler
  const handleExport = async () => {
    if (filteredStaff.length === 0) return;

    const XLSX = await import("xlsx");

    const exportRows = filteredStaff.map((s, idx) => ({
      "Sl. No.": idx + 1,
      "Employee ID": s.unique_id,
      "Full Name": s.full_name,
      "Role": s.employee_type === "TEACHING" ? "Teaching Staff" : "Non-Teaching Staff",
      "Designation": s.designation,
      "Caste": s.caste || "N/A",
      "Mobile Contact": s.mobile || "N/A",
      "Date of Birth": s.dob || "N/A",
      "Status": s.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Records");

    const fileName = `Staff_Directory_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const pageTitle =
    typeParam === "teaching"
      ? "Teaching Staff Directory"
      : typeParam === "non-teaching"
      ? "Non-Teaching Staff Directory"
      : "Employee Register";

  const hasFilters = Boolean(
    filters.query || filters.designation || filters.caste || filters.status
  );

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full animate-fade-in-up">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            title="Go back"
            className="rounded-xl p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer border border-transparent hover:border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {pageTitle}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-200",
                  hasFilters
                    ? "bg-primary/10 text-primary border-primary/25 font-bold shadow-2xs"
                    : "bg-muted/80 text-muted-foreground border-border"
                )}
              >
                <span className="font-mono text-xs font-bold">
                  {filteredStaff.length}
                </span>
                <span className="text-[11px] font-medium opacity-85">
                  {hasFilters ? "matching found" : "total records"}
                </span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Comprehensive institutional faculty, administrative, and support staff records.
            </p>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <StaffStatsCards
        total={stats.total}
        teachingCount={stats.teachingCount}
        nonTeachingCount={stats.nonTeachingCount}
        activeCount={stats.activeCount}
      />

      {/* 3. Search & Filter Bar */}
      <div className="rounded-2xl border border-border/80 bg-card/80 p-3 sm:p-4 shadow-xs backdrop-blur-xs">
        <StaffFiltersBar
          filters={filters}
          onChange={setFilters}
          availableDesignations={availableDesignations}
          availableCastes={availableCastes}
          onExportClick={handleExport}
          onAddClick={() => alert("Add Employee form is being prepared for registration.")}
        />
      </div>

      {/* 4. Staff Data Table */}
      <StaffTable data={filteredStaff} />
    </div>
  );
}
