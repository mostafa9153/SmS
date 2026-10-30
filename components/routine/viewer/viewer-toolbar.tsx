"use client";

import { DAY_NAMES } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, FileText, Calendar, Users, School, Building2, RotateCcw, Filter, UserCheck, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { cn } from "@/lib/utils";
import { ViewerDropdown } from "@/components/routine/viewer/viewer-dropdown";
import type { RoutineViewerState } from "./use-routine-viewer";

export function ViewerToolbar({ viewer }: { viewer: RoutineViewerState }) {
  const { activeDays, allDistinctSectionNames, availableSectionsForCurrentClass, classMap, currentClassName, distinctClassNames, distinctFacultySubjects, halfDays, handleExportExcel, handlePrint, handleSelectClass, handleSelectSection, handleUndo, hideViewModeSelector, history, isFullscreen, masterDaySelection, masterFacultyFilter, masterSectionFilter, paperSettings, rooms, selectedClassId, selectedRoomId, selectedTeacherId, setMasterDaySelection, setMasterFacultyFilter, setMasterSectionFilter, setSelectedRoomId, setSelectedTeacherId, setViewMode, setZoomLevel, teacherMap, teachers, toggleFullscreen, viewMode, zoomLevel } = viewer;
  return (
    <div className="print:hidden bg-card border rounded-lg p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
      {/* Mode Segmented Controls */}
      {!hideViewModeSelector ? (
        <div className="flex items-center bg-muted/70 p-1 rounded-lg text-xs font-semibold gap-1 border border-border/70 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode("master")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
              viewMode === "master"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Master (Day-wise)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("master-teacher")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
              viewMode === "master-teacher"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Master (Teacher-wise)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("class")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
              viewMode === "class"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <School className="h-3.5 w-3.5" />
            <span>Class-wise</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
              viewMode === "teacher"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Teacher-wise</span>
          </button>

          {rooms.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode("room")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                viewMode === "room"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Room-wise</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-foreground">
              {teacherMap.get(selectedTeacherId)?.name || "Teacher"}&apos;s Weekly Schedule
            </p>
            <p className="text-[10px] text-muted-foreground">Full Week Timetable Grid</p>
          </div>
        </div>
      )}

      {/* Dynamic Selector Dropdowns & Actions */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Master Day-wise View Controls: Day + Section Filter */}
        {viewMode === "master" && (
          <>
            <ViewerDropdown
              value={masterDaySelection}
              onChange={setMasterDaySelection}
              options={[
                { value: "ALL", label: "All Days (Full Week)" },
                ...activeDays.map((dIdx, idx) => ({
                  value: String(idx),
                  label: `${DAY_NAMES[dIdx]}${halfDays.includes(dIdx) ? " (Half)" : ""}`,
                })),
              ]}
              labelPrefix="Day"
              icon={<Calendar className="w-3.5 h-3.5" />}
            />

            <ViewerDropdown
              value={masterSectionFilter}
              onChange={setMasterSectionFilter}
              options={[
                { value: "ALL", label: "All Sections" },
                ...allDistinctSectionNames.map((sec) => ({
                  value: sec,
                  label: `Section ${sec}`,
                })),
              ]}
              labelPrefix="Section"
              icon={<Filter className="w-3.5 h-3.5" />}
            />
          </>
        )}

        {/* Master Teacher-wise View Controls: Day + Subject Filter */}
        {viewMode === "master-teacher" && (
          <>
            <ViewerDropdown
              value={masterDaySelection}
              onChange={setMasterDaySelection}
              options={[
                { value: "ALL", label: "All Days (Full Week)" },
                ...activeDays.map((dIdx, idx) => ({
                  value: String(idx),
                  label: `${DAY_NAMES[dIdx]}${halfDays.includes(dIdx) ? " (Half)" : ""}`,
                })),
              ]}
              labelPrefix="Day"
              icon={<Calendar className="w-3.5 h-3.5" />}
            />

            {distinctFacultySubjects.length > 0 && (
              <ViewerDropdown
                value={masterFacultyFilter}
                onChange={setMasterFacultyFilter}
                options={[
                  { value: "ALL", label: "All Faculty" },
                  ...distinctFacultySubjects.map((sub) => ({
                    value: sub,
                    label: sub,
                  })),
                ]}
                labelPrefix="Department"
                icon={<Filter className="w-3.5 h-3.5" />}
              />
            )}
          </>
        )}

        {/* Class-wise View Controls: Class Dropdown + Section Dropdown */}
        {viewMode === "class" && (
          <>
            <ViewerDropdown
              value={currentClassName}
              onChange={handleSelectClass}
              options={distinctClassNames.map((name) => ({
                value: name,
                label: name,
              }))}
              labelPrefix="Class"
              icon={<School className="w-3.5 h-3.5" />}
            />

            <ViewerDropdown
              value={selectedClassId}
              onChange={handleSelectSection}
              options={availableSectionsForCurrentClass.map((c) => ({
                value: c.id,
                label: `Section ${c.section}`,
              }))}
              labelPrefix="Section"
            />

            {(() => {
              const selectedClass = classMap.get(selectedClassId);
              const ct = selectedClass
                ? teachers.find((t) => {
                    if (!t.classTeacherOf) return false;
                    const fullLabel = `${selectedClass.className}${selectedClass.section && selectedClass.section !== "ALL" ? ` - ${selectedClass.section}` : ""}`.toLowerCase();
                    return (
                      t.classTeacherOf.toLowerCase() === fullLabel ||
                      t.classTeacherOf.toLowerCase() === selectedClass.className.toLowerCase()
                    );
                  })
                : null;
              return ct ? (
                <Badge
                  variant="secondary"
                  className="text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 h-8 px-2.5 flex items-center"
                >
                  CT: {ct.name} ({ct.shortName})
                </Badge>
              ) : null;
            })()}
          </>
        )}

        {/* Teacher-wise View Controls */}
        {viewMode === "teacher" && (
          <>
            <ViewerDropdown
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              options={teachers.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.shortName || "-"})`,
              }))}
              labelPrefix="Faculty"
              icon={<Users className="w-3.5 h-3.5" />}
              className="max-w-[200px]"
            />
            {(() => {
              const tch = teacherMap.get(selectedTeacherId);
              return tch && (tch.primarySubject || tch.classTeacherOf) ? (
                <div className="hidden sm:flex items-center gap-1.5">
                  {tch.primarySubject && (
                    <Badge variant="outline" className="text-[11px] font-medium h-8 px-2.5 flex items-center">
                      {tch.primarySubject}
                    </Badge>
                  )}
                  {tch.classTeacherOf && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 h-8 px-2.5 flex items-center"
                    >
                      CT: {tch.classTeacherOf}
                    </Badge>
                  )}
                </div>
              ) : null;
            })()}
          </>
        )}

        {/* Room-wise View Controls */}
        {viewMode === "room" && (
          <ViewerDropdown
            value={selectedRoomId}
            onChange={setSelectedRoomId}
            options={rooms.map((r) => ({
              value: r.id,
              label: `${r.name}${r.isLab ? " (Lab)" : ""}`,
            }))}
            labelPrefix="Room"
            icon={<Building2 className="w-3.5 h-3.5" />}
          />
        )}

        {viewMode === "master" && history.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Undo ({history.length})</span>
          </Button>
        )}

        
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print Timetable</span>
          </Button>

          <Popover>
            <PopoverTrigger
              className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-input bg-background text-xs font-semibold shadow-xs hover:bg-accent cursor-pointer"
              title="Paper & margin"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{paperSettings.paper} {paperSettings.orientation === "landscape" ? "Landscape" : "Portrait"}</span>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" sideOffset={8} className="w-72 p-3 rounded-2xl">
              <PaperSettingsPanel settings={paperSettings} orientations variant="bare" defaultOpen />
            </PopoverContent>
          </Popover>

          {/* Zoom Controls */}
          <div className="flex items-center bg-muted/60 border border-input rounded-md p-0.5 gap-0.5 shadow-2xs h-8">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
              disabled={zoomLevel <= 60}
              title="Zoom Out (Ctrl -)"
              className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              title="Reset Zoom to 100%"
              className="px-1.5 h-7 text-[11px] font-mono font-bold text-foreground hover:bg-background/80 rounded transition-colors flex items-center justify-center cursor-pointer min-w-[38px]"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              disabled={zoomLevel >= 150}
              title="Zoom In (Ctrl +)"
              className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Full Screen Toggle Button */}
          <Button
            variant={isFullscreen ? "default" : "outline"}
            size="sm"
            onClick={toggleFullscreen}
            className={cn(
              "h-8 text-xs font-semibold gap-1.5 shadow-xs transition-all",
              isFullscreen
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-background hover:bg-muted"
            )}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Exit Full Screen</span>
                <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 text-[9px] bg-primary-foreground/20 rounded font-mono">
                  Esc
                </kbd>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-primary" />
                <span>Full Screen</span>
              </>
            )}
          </Button>
        </div>
      </div>
  );
}
