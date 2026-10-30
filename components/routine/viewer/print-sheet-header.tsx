"use client";

import { DAY_NAMES } from "@/lib/routine/types";

import type { RoutineViewerState } from "./use-routine-viewer";

export function PrintSheetHeader({ viewer }: { viewer: RoutineViewerState }) {
  const { activeDays, classMap, masterDayIdx, masterDaySelection, masterFacultyFilter, masterSectionFilter, roomMap, selectedClassId, selectedRoomId, selectedTeacherId, teacherMap, teachers, viewMode } = viewer;
  return (
    <div className="hidden print:block text-center border-b pb-3 mb-4">
      <h1 className="text-xl font-bold uppercase tracking-tight">Academic Routine & Master Timetable</h1>
      <div className="text-xs text-muted-foreground font-semibold mt-0.5">
        {viewMode === "master" && `Master Schedule (Day-wise) — ${masterDaySelection === "ALL" ? "All Days (Full Week)" : DAY_NAMES[activeDays[masterDayIdx] || 0]}${masterSectionFilter !== "ALL" ? ` (Section ${masterSectionFilter})` : ""}`}
        {viewMode === "master-teacher" && `Master Faculty Schedule (Teacher-wise) — ${masterDaySelection === "ALL" ? "All Days (Full Week)" : DAY_NAMES[activeDays[masterDayIdx] || 0]}${masterFacultyFilter !== "ALL" ? ` (${masterFacultyFilter})` : ""}`}
        {viewMode === "class" && (
          <>
            Class Schedule — {classMap.get(selectedClassId)?.className || ""}{" "}
            {classMap.get(selectedClassId)?.section || ""}
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
              return ct ? ` | Class Teacher: ${ct.name} (${ct.shortName})` : "";
            })()}
          </>
        )}
        {viewMode === "teacher" &&
          `Faculty Timetable — ${teacherMap.get(selectedTeacherId)?.name || ""} (${teacherMap.get(selectedTeacherId)?.shortName || ""})${teacherMap.get(selectedTeacherId)?.primarySubject ? ` | Subject: ${teacherMap.get(selectedTeacherId)?.primarySubject}` : ""}`}
        {viewMode === "room" && `Facility Timetable — ${roomMap.get(selectedRoomId)?.name || ""}`}
      </div>
    </div>
  );
}
