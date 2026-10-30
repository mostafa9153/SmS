"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";

import type { AllotmentOverviewState } from "./use-routine-allotment-overview";

export function ControlBar({ ao }: { ao: AllotmentOverviewState }) {
  const { filterClass, filterTeacher, issuesOnly, searchQuery, selectedTeacherObj, setFilterClass, setFilterTeacher, setIssuesOnly, setSearchQuery, teacherLoadRows, teacherMatrixStats, teachers, uniqueClassNames } = ao;
  return (
    <div className="bg-card border rounded-lg p-2.5 shadow-xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 min-w-0">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search class, subject, teacher..." size="sm" className="w-48 sm:w-56 shrink-0" />

        {/* Class Filter */}
        <Select value={filterClass} onValueChange={(val) => setFilterClass(val ?? "all")}>
          <SelectTrigger className="h-8 w-36 shrink-0 text-xs bg-background">
            <SelectValue>
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground font-normal">Class:</span>
                <span className="font-semibold text-foreground">{filterClass === "all" ? "All" : filterClass}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs font-semibold">All Classes</SelectItem>
            {uniqueClassNames.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Teacher Filter */}
        <Select
          value={selectedTeacherObj ? selectedTeacherObj.teacherId : "all"}
          onValueChange={(val) => setFilterTeacher(val ?? "all")}
        >
          <SelectTrigger className="h-8 w-64 sm:w-72 shrink-0 text-xs bg-background">
            <SelectValue>
              <span className="flex items-center gap-1 truncate">
                <span className="text-muted-foreground font-normal shrink-0">Teacher:</span>
                <span className="font-semibold text-foreground truncate">
                  {selectedTeacherObj
                    ? `${selectedTeacherObj.name} (${selectedTeacherObj.teacherCode})`
                    : "All"}
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80 w-auto min-w-[360px] max-w-[480px]">
            <SelectItem value="all" className="text-xs font-semibold">
              All Faculty ({teachers.length})
            </SelectItem>
            {teacherLoadRows.map((t) => {
              const stats = teacherMatrixStats.get(t.teacherId);
              const classCount = stats ? stats.uniqueClasses.size : new Set(t.assignedClasses.map((ac) => ac.label)).size;
              const periodsCount = stats ? stats.totalPeriods : t.totalAssignedPeriods;
              return (
                <SelectItem key={t.teacherId} value={t.teacherId} className="text-xs">
                  <span className="font-semibold text-foreground">{t.name}</span>
                  <span className="text-muted-foreground ml-1.5 font-mono">({t.teacherCode})</span>
                  <span className="text-muted-foreground ml-2 text-[11px] font-mono">
                    — {classCount}C, {periodsCount}P
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Reset Filters button */}
        {(filterClass !== "all" || filterTeacher !== "all") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterClass("all");
              setFilterTeacher("all");
            }}
            className="h-8 text-xs text-muted-foreground hover:text-foreground px-2 gap-1 shrink-0"
            title="Reset all filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant={issuesOnly ? "destructive" : "outline"}
          size="sm"
          onClick={() => setIssuesOnly(!issuesOnly)}
          className={cn(
            "h-8 text-xs font-semibold gap-1.5 px-3 shrink-0",
            issuesOnly ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/30" : ""
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{issuesOnly ? "Showing Issues Only" : "Highlight Issues"}</span>
        </Button>
      </div>
    </div>
  );
}
