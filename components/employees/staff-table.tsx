"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  Loader2,
  ChevronRight,
  Phone,
  Calendar,
  Briefcase,
  ShieldCheck,
  Check,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { cn, calculateDetailedAge } from "@/lib/utils";

export interface StaffProfile {
  id: string;
  unique_id: string;
  full_name: string;
  employee_type: "TEACHING" | "NON_TEACHING";
  designation: string;
  caste?: string;
  mobile?: string;
  dob?: string;
  status: "ACTIVE" | "INACTIVE" | "RETIRED" | "SUSPENDED";
}

interface StaffTableProps {
  data: StaffProfile[];
  isLoading?: boolean;
}

export function StaffTable({ data, isLoading = false }: StaffTableProps) {
  const router = useRouter();
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const handleRowClick = (id: string) => {
    setNavigatingId(id);
    router.push(`/employees/${id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full rounded-2xl bg-muted/40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
        <Inbox className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-base font-semibold text-foreground">
          No staff records found
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Try adjusting your search criteria or clear the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile Stacked Cards View (<md) */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {data.map((staff, idx) => {
          const isNavigating = navigatingId === staff.id;
          const dAge = staff.dob ? calculateDetailedAge(staff.dob) : null;

          return (
            <div
              key={staff.id}
              onTouchStart={() => router.prefetch(`/employees/${staff.id}`)}
              onMouseEnter={() => router.prefetch(`/employees/${staff.id}`)}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest("button") ||
                  target.closest("a") ||
                  target.closest("[data-prevent-row-click]")
                ) {
                  return;
                }
                handleRowClick(staff.id);
              }}
              className={cn(
                "relative rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition-all duration-150 cursor-pointer",
                "hover:border-primary/40 active:scale-[0.99] active:bg-muted/40",
                isNavigating && "ring-2 ring-primary/40 bg-primary/5"
              )}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  {/* Avatar Initial */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                    {staff.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                      {staff.full_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground font-semibold">
                        {staff.unique_id}
                      </span>
                      <CopyButton
                        text={staff.unique_id}
                        label="Staff ID"
                        iconClassName="h-3 w-3"
                      />
                    </div>
                  </div>
                </div>

                <Badge
                  variant={staff.status === "ACTIVE" ? "default" : "secondary"}
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    staff.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mr-1.5",
                      staff.status === "ACTIVE" ? "bg-emerald-500" : "bg-muted-foreground"
                    )}
                  />
                  {staff.status}
                </Badge>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground bg-muted/80 px-2 py-0.5 rounded-md border text-[11px]">
                    {staff.designation}
                  </span>
                  {staff.caste && (
                    <span className="text-[10px] text-muted-foreground">
                      {staff.caste}
                    </span>
                  )}
                </div>

                {staff.mobile && (
                  <a
                    href={`tel:${staff.mobile}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 font-mono text-primary font-medium hover:underline text-[11px]"
                  >
                    <Phone className="h-3 w-3" />
                    {staff.mobile}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Data Table (hidden on mobile, visible md+) */}
      <div className="hidden md:block rounded-2xl border border-border/80 bg-card/90 overflow-x-auto shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Staff ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Staff Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Designation & Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Caste
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase pr-6">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((staff, index) => {
              const isNavigating = navigatingId === staff.id;
              const dAge = staff.dob ? calculateDetailedAge(staff.dob) : null;

              return (
                <tr
                  key={staff.id}
                  onMouseEnter={() => router.prefetch(`/employees/${staff.id}`)}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest("button") ||
                      target.closest("a") ||
                      target.closest("[data-prevent-row-click]")
                    ) {
                      return;
                    }
                    handleRowClick(staff.id);
                  }}
                  className={cn(
                    "relative cursor-pointer transition-all duration-150 group select-none",
                    "hover:bg-primary/[0.06] dark:hover:bg-primary/10",
                    "active:scale-[0.998] active:bg-primary/15",
                    isNavigating
                      ? "bg-primary/10 border-l-4 border-l-primary shadow-xs font-medium"
                      : "border-l-4 border-l-transparent"
                  )}
                  title={`Click to view ${staff.full_name}'s full profile`}
                >
                  {/* Sl. No. */}
                  <td className="px-4 py-3.5 align-middle">
                    <span className="font-mono text-xs font-semibold text-muted-foreground/80">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                  </td>

                  {/* Staff ID */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                      <span>{staff.unique_id}</span>
                      <CopyButton
                        text={staff.unique_id}
                        label="Staff ID"
                        iconClassName="h-3 w-3"
                      />
                    </div>
                  </td>

                  {/* Staff Member */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                        {staff.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {staff.full_name}
                        </p>
                        {staff.dob && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                            <Calendar className="h-3 w-3 opacity-70" />
                            <span>DOB: {staff.dob}</span>
                            {dAge && (
                              <span className="text-muted-foreground/75 font-normal">
                                ({dAge.years} yrs)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Designation & Role */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="space-y-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-foreground border border-border/60">
                        {staff.designation}
                      </span>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground/75 tracking-wider">
                        {staff.employee_type === "TEACHING"
                          ? "Teaching Staff"
                          : "Non-Teaching Staff"}
                      </div>
                    </div>
                  </td>

                  {/* Caste */}
                  <td className="px-4 py-3.5 align-middle">
                    <Badge
                      variant="outline"
                      className="font-normal text-xs px-2 py-0.5 text-muted-foreground"
                    >
                      {staff.caste || "N/A"}
                    </Badge>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3.5 align-middle">
                    {staff.mobile ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${staff.mobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-foreground font-medium hover:text-primary hover:underline flex items-center gap-1"
                          title="Call employee"
                        >
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {staff.mobile}
                        </a>
                        <CopyButton
                          text={staff.mobile}
                          label="Mobile Number"
                          iconClassName="h-3 w-3"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Not provided
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                        staff.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          staff.status === "ACTIVE"
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-muted-foreground"
                        )}
                      />
                      {staff.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5 align-middle text-right pr-6">
                    {isNavigating ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold animate-pulse">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Opening...</span>
                      </span>
                    ) : (
                      <Link
                        href={`/employees/${staff.id}`}
                        prefetch={true}
                        onClick={() => setNavigatingId(staff.id)}
                        className="flex items-center justify-end gap-1 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 cursor-pointer"
                      >
                        <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                          View
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
