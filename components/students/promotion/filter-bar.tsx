"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { RotateCcw, Search } from "lucide-react";
import { ALL_CLASSES, EXAM_OPTIONS } from "@/components/students/promotion/constants";
import type { PromotionDeskState } from "./use-promotion-desk";

export function FilterBar({ desk }: { desk: PromotionDeskState }) {
  const { academicYear, classes, currentYear, handleClassChange, handleExamChange, handleResetAllOverrides, isHS, manualOverrides, rollStrategy, searchQuery, sections, selectedClass, selectedExam, selectedSection, selectedSemester, setAcademicYear, setRollStrategy, setSearchQuery, setSelectedIds, setSelectedSectionState, setSelectedSemester } = desk;
  return (
    <div className="rounded-2xl border bg-card p-3 sm:p-4 space-y-3 shadow-2xs">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Class */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Class</label>
          <CustomSelect
            value={selectedClass}
            onChange={handleClassChange}
            options={(classes.length > 0 ? classes : ALL_CLASSES).map((c) => ({ label: `Class ${c}`, value: c }))}
          />
        </div>

        {/* Section */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Section</label>
          <CustomSelect
            value={selectedSection}
            onChange={(val) => {
              setSelectedSectionState(val);
              setSelectedIds(new Set());
            }}
            placeholder="All Sections"
            options={[
              { label: "All Sections", value: "" },
              ...sections.map((s) => ({ label: `Section ${s}`, value: s })),
            ]}
          />
        </div>

        {/* Academic Year */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Academic Year</label>
          <CustomSelect
            value={String(academicYear)}
            onChange={(val) => setAcademicYear(parseInt(val))}
            options={[
              { label: `${currentYear}`, value: String(currentYear) },
              { label: `${currentYear - 1}`, value: String(currentYear - 1) },
              { label: `${currentYear + 1}`, value: String(currentYear + 1) },
            ]}
          />
        </div>

        {/* Exam Name */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Evaluation Exam</label>
          <CustomSelect
            value={selectedExam}
            onChange={handleExamChange}
            options={EXAM_OPTIONS}
          />
        </div>

        {/* Roll Strategy */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Roll Assignment</label>
          <CustomSelect
            value={rollStrategy}
            onChange={(val) => setRollStrategy(val as any)}
            options={[
              { label: "🏆 Rank-Based (Marks)", value: "rank" },
              { label: "🔄 Preserve Roll", value: "preserve" },
              { label: "🔤 Alphabetical (A-Z)", value: "alphabetical" },
            ]}
          />
        </div>
      </div>

      {/* Secondary Bar: Semester (if HS) & Search & Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t">
        <div className="flex flex-wrap items-center gap-2">
          {isHS && (
            <div className="inline-flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border">
              {(["", "Sem 1", "Sem 2", "Sem 3", "Sem 4"] as const).map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    selectedSemester === sem
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sem || "All Semesters"}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, roll, or ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border bg-background text-xs placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {Object.keys(manualOverrides).length > 0 && (
            <button
              onClick={handleResetAllOverrides}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset {Object.keys(manualOverrides).length} Override(s)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
