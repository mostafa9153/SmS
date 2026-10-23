"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStudents, searchStudents } from "@/lib/data/students";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Student } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  CheckCircle2,
  CheckSquare,
  Square,
  Users,
  ListChecks,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSavedClassPresets, getSectionsForClass } from "@/lib/utils/marks-config";

export type StudentPickerMode = "single" | "bulk";

interface StudentPickerProps {
  mode: StudentPickerMode;
  onModeChange: (mode: StudentPickerMode) => void;
  selectedStudent?: Student | null;
  onSelectStudent?: (student: Student) => void;
  onClearSelection?: () => void;
  selectedIds?: string[];
  onBulkSelectionChange?: (students: Student[]) => void;
  /** Bulk mode only: lets one roster row be marked "active" (e.g. for a live single preview) independent of the checkbox selection. */
  activeId?: string | null;
  onActivate?: (student: Student) => void;
  allowBulk?: boolean;
  className?: string;
}

export function StudentPicker({
  mode,
  onModeChange,
  selectedStudent,
  onSelectStudent,
  onClearSelection,
  selectedIds = [],
  onBulkSelectionChange,
  activeId,
  onActivate,
  allowBulk = true,
  className,
}: StudentPickerProps) {
  const classPresets = useMemo(() => getSavedClassPresets(), []);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);

  const sectionOptions = useMemo(
    () => (selectedClass ? getSectionsForClass(selectedClass) : []),
    [selectedClass]
  );

  const isGateOpen = Boolean(selectedClass && selectedSection);

  // Reset section when the class changes to one that doesn't have it
  const [prevClass, setPrevClass] = useState(selectedClass);
  if (prevClass !== selectedClass) {
    setPrevClass(selectedClass);
    if (selectedSection) setSelectedSection("");
  }

  // Clear the search box whenever the mode is toggled
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    if (searchText) setSearchText("");
  }

  // ── Single mode: debounced server-side search (class + section + query) ──
  const { data: singleResults, isFetching: isSearching } = useQuery({
    queryKey: ["students", "picker-search", selectedClass, selectedSection, debouncedSearch],
    queryFn: () =>
      searchStudents(
        { query: debouncedSearch, class: selectedClass, section: selectedSection },
        1,
        15,
        "summary"
      ),
    enabled: mode === "single" && isGateOpen && debouncedSearch.trim().length > 0,
  });
  const singleMatches = singleResults?.data || [];

  // ── Bulk mode: full roster for the chosen class + section ──
  const { data: roster = [], isLoading: isLoadingRoster } = useQuery({
    queryKey: ["students", "picker-roster", selectedClass, selectedSection],
    queryFn: () => getStudents("summary", selectedClass, selectedSection),
    enabled: mode === "bulk" && isGateOpen,
  });

  const filteredRoster = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = q
      ? roster.filter((s) => {
          return (
            (s.name || "").toLowerCase().includes(q) ||
            String(s.presentRoll || "").includes(q) ||
            (s.schoolId || "").toLowerCase().includes(q) ||
            (s.pen || "").toLowerCase().includes(q) ||
            (s.id || "").toLowerCase().includes(q)
          );
        })
      : roster;
    return [...list].sort((a, b) => (a.presentRoll || 0) - (b.presentRoll || 0));
  }, [roster, searchText]);

  const allRosterSelected =
    filteredRoster.length > 0 && filteredRoster.every((s) => selectedIds.includes(s.id));

  function toggleRosterStudent(student: Student) {
    const isSelected = selectedIds.includes(student.id);
    const nextIds = isSelected
      ? selectedIds.filter((id) => id !== student.id)
      : [...selectedIds, student.id];
    const nextStudents = roster.filter((s) => nextIds.includes(s.id));
    onBulkSelectionChange?.(nextStudents);
  }

  function toggleSelectAllRoster() {
    if (allRosterSelected) {
      const remaining = roster.filter(
        (s) => selectedIds.includes(s.id) && !filteredRoster.some((f) => f.id === s.id)
      );
      onBulkSelectionChange?.(remaining);
    } else {
      const merged = new Set([...selectedIds, ...filteredRoster.map((s) => s.id)]);
      onBulkSelectionChange?.(roster.filter((s) => merged.has(s.id)));
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode Toggle */}
      {allowBulk && (
        <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onModeChange("single")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
              mode === "single"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            Single Student
          </button>
          <button
            type="button"
            onClick={() => onModeChange("bulk")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
              mode === "bulk"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Multiple (Bulk)
          </button>
        </div>
      )}

      {/* Class + Section Gate */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-muted-foreground">Class</Label>
          <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || "")}>
            <SelectTrigger className="h-8.5 text-xs w-full">
              <SelectValue placeholder="Select class..." />
            </SelectTrigger>
            <SelectContent>
              {classPresets.map((c) => (
                <SelectItem key={c.id} value={c.code} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-muted-foreground">Section</Label>
          <Select value={selectedSection} onValueChange={(val) => setSelectedSection(val || "")} disabled={!selectedClass}>
            <SelectTrigger className="h-8.5 text-xs w-full">
              <SelectValue placeholder="Select section..." />
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={
            isGateOpen
              ? mode === "single"
                ? "Search by Student ID, Name, Roll No, or PEN..."
                : "Filter this list by name, roll, ID, or PEN..."
              : "Select Class & Section above first..."
          }
          value={searchText}
          disabled={!isGateOpen}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-8 pr-8 text-xs h-8.5 disabled:bg-muted/50 disabled:opacity-60"
        />
        {searchText && (
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Single mode: dropdown results */}
        {mode === "single" && debouncedSearch.trim().length > 0 && (
          <div className="absolute z-20 top-9 left-0 right-0 rounded-xl border bg-popover text-popover-foreground shadow-lg overflow-hidden py-1 max-h-72 overflow-y-auto">
            {isSearching ? (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">Searching...</div>
            ) : singleMatches.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                No students found in Class {selectedClass}-{selectedSection}.
              </div>
            ) : (
              singleMatches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelectStudent?.(s);
                    setSearchText("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-muted/70 text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-foreground">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Roll: {s.presentRoll || "N/A"} &bull; {s.presentClass}-{s.presentSection} &bull; {s.schoolId || s.id}
                    </div>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary font-mono px-1.5 py-0.5 rounded shrink-0">
                    Select
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Single mode: auto-filled confirmation chip */}
      {mode === "single" && selectedStudent && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/40 p-2 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">
              Auto-filled: <strong>{selectedStudent.name}</strong> ({selectedStudent.schoolId || selectedStudent.id})
            </span>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 p-0.5 rounded cursor-pointer shrink-0"
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Bulk mode: full roster with checkboxes */}
      {mode === "bulk" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleSelectAllRoster}
              disabled={!isGateOpen || filteredRoster.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {allRosterSelected ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Select All ({filteredRoster.length})
                </>
              )}
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              {selectedIds.length} selected
            </span>
          </div>

          <div className="max-h-[280px] overflow-y-auto rounded-xl border divide-y divide-border/60 bg-background/50">
            {!isGateOpen ? (
              <div className="p-8 text-center space-y-1 text-muted-foreground">
                <Users className="h-6 w-6 mx-auto opacity-35 text-primary" />
                <p className="text-xs font-semibold text-foreground">Select Class & Section</p>
                <p className="text-[11px] text-muted-foreground">
                  Choose Class and Section above to load the student list.
                </p>
              </div>
            ) : isLoadingRoster ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Loading Class {selectedClass}-{selectedSection} students...
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No students found in Class {selectedClass}-{selectedSection}
                {searchText ? ` matching "${searchText}"` : ""}.
              </div>
            ) : (
              filteredRoster.map((student) => {
                const isChecked = selectedIds.includes(student.id);
                const isActive = onActivate ? student.id === activeId : false;
                return (
                  <div
                    key={student.id}
                    onClick={() => (onActivate ? onActivate(student) : toggleRosterStudent(student))}
                    className={cn(
                      "p-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer text-xs",
                      isActive ? "bg-primary/10 border-l-3 border-primary" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRosterStudent(student);
                        }}
                        className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground truncate">{student.name}</span>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            Roll {student.presentRoll || "-"}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 truncate font-mono">
                          <span>ID: {student.schoolId || student.id.slice(0, 8)}</span>
                          <span>•</span>
                          <span>PEN: {student.pen || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {onActivate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActivate(student);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-semibold shrink-0 transition-all",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        View
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
