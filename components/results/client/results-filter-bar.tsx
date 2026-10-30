"use client";

import { sessionYears } from "@/lib/utils/academic-year";
import { SlidersHorizontal } from "lucide-react";
import { Semester } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/ui/filter-select";
import { SearchInput } from "@/components/ui/search-input";

import type { ResultsClientState } from "./use-results-client";

export function ResultsFilterBar({ rc }: { rc: ResultsClientState }) {
  const { academicYear, classOptions, classSubjects, currentYear, examOptions, filteredResults, handleSelectAcademicYear, handleSelectClass, handleSelectExam, handleSelectGender, handleSelectSection, handleSelectSemester, handleSelectSubject, isHs, localQuery, mobileFilterOpen, sectionOptions, selectedClass, selectedExam, selectedGender, selectedSection, selectedSemester, selectedSubject, setLocalQuery, setMobileFilterOpen } = rc;
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/80 px-3 sm:px-6 py-2 sm:py-3 shadow-2xs space-y-2">
      {/* Mobile Top Bar (<sm): Search + Filter Drawer Trigger */}
      <div className="flex sm:hidden items-center gap-2.5">
        <SearchInput value={localQuery} onChange={setLocalQuery} placeholder="Search students..." className="flex-1" />

        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer h-11 min-h-[44px] bg-primary text-primary-foreground border-primary shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Mobile Filter Sheet Drawer */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] rounded-t-[2.25rem] p-5 overflow-y-auto space-y-4 border-t border-border shadow-2xl pb-safe"
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2" />
          <SheetHeader className="p-0 flex flex-row items-center justify-between border-b pb-3 text-left">
            <SheetTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filter Evaluation
            </SheetTitle>
          </SheetHeader>

          {/* Touch Class Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Select Class</label>
            <div className="flex flex-wrap gap-1.5">
              {classOptions.map((c) => {
                const isSelected = selectedClass === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleSelectClass(c.value)}
                    className={cn(
                      "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border/80 text-foreground hover:bg-muted"
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Touch Section Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Select Section</label>
            <div className="flex flex-wrap gap-1.5">
              {sectionOptions.map((s) => {
                const isSelected = selectedSection === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleSelectSection(s.value)}
                    className={cn(
                      "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border/80 text-foreground hover:bg-muted"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Touch Subject Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Select Subject</label>
            <div className="flex flex-wrap gap-1.5">
              {classSubjects.map((sub) => {
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSelectSubject(sub)}
                    className={cn(
                      "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border/80 text-foreground hover:bg-muted"
                    )}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Touch Gender Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Select Gender</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "ALL", label: "All Genders" },
                { value: "Male", label: "Boys" },
                { value: "Female", label: "Girls" },
              ].map((g) => {
                const isSelected = selectedGender === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => handleSelectGender(g.value as any)}
                    className={cn(
                      "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border/80 text-foreground hover:bg-muted"
                    )}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 sticky bottom-0 bg-background pb-2">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full h-12 min-h-[48px] rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Apply Selection</span>
              <span className="opacity-90 font-mono font-normal text-xs">
                ({filteredResults.length} students)
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Filter Bar (visible sm+) */}
      <div className="hidden sm:flex flex-wrap gap-2 items-center">
        {/* Smart search */}
        <SearchInput value={localQuery} onChange={setLocalQuery} placeholder="Search name, roll, or ID…" size="sm" className="min-w-[170px] flex-1 max-w-xs" />

        {/* Year filter */}
        <FilterSelect
          value={String(academicYear)}
          onChange={(v) => handleSelectAcademicYear(parseInt(v, 10))}
          placeholder="Year"
          options={sessionYears(currentYear).map((y) => ({ label: y, value: y }))}
        />

        {/* Class filter */}
        <FilterSelect
          value={selectedClass}
          onChange={handleSelectClass}
          placeholder="Class"
          options={classOptions}
        />

        {/* Section filter (Dynamically from School Settings) */}
        <FilterSelect
          value={selectedSection}
          onChange={handleSelectSection}
          placeholder="Section"
          options={sectionOptions}
        />

        {/* Gender filter (All / Boys / Girls) */}
        <FilterSelect
          value={selectedGender}
          onChange={(v) => handleSelectGender(v as "ALL" | "Male" | "Female")}
          placeholder="Gender"
          options={[
            { label: "All Genders", value: "ALL" },
            { label: "Boys", value: "Male" },
            { label: "Girls", value: "Female" },
          ]}
        />

        {/* Semester filter (Higher Secondary Class XI / XII Only) */}
        {isHs && (
          <FilterSelect
            value={selectedSemester}
            onChange={(v) => handleSelectSemester(v as Semester | "ALL")}
            placeholder="Semester"
            options={
              selectedClass === "XI"
                ? [
                    { label: "All Semesters", value: "ALL" },
                    { label: "Semester 1", value: "Sem 1" },
                    { label: "Semester 2", value: "Sem 2" },
                  ]
                : [
                    { label: "All Semesters", value: "ALL" },
                    { label: "Semester 3", value: "Sem 3" },
                    { label: "Semester 4", value: "Sem 4" },
                  ]
            }
          />
        )}

        {/* Evaluation / Exam */}
        <FilterSelect
          value={selectedExam}
          onChange={handleSelectExam}
          placeholder="Evaluation"
          options={examOptions.map((e) => ({ label: e, value: e }))}
        />

        {/* Subject Selector */}
        <FilterSelect
          value={selectedSubject}
          onChange={handleSelectSubject}
          placeholder="Subject"
          options={classSubjects.map((s) => ({ label: s, value: s }))}
          highlight
        />
      </div>
    </div>
  );
}
