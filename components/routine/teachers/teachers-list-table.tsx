"use client";

import { Users } from "lucide-react";
import { TeacherSummaryBadges } from "./teacher-summary-badges";
import { TeacherTableRow } from "./teacher-table-row";

import type { RoutineTeachersState } from "./use-routine-teachers";

export function TeachersListTable({ rt }: { rt: RoutineTeachersState }) {
  const { classTotalSubjectsMap, editingTeacherId, groupChipsByTeacher, groupMemberNamesByClass, handleDelete, handleEdit, isEditorOpen, onDeleteTeacher, settings, subjects, teacherLoadMap, teachers, totalAllottedLoad, totalAssignedSubjects, totalSchoolDemand, totalSchoolSubjects, unassignedSubjects } = rt;
  return (
    <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
      <div className="px-4 py-2 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-2">
        <TeacherSummaryBadges
          totalStaffCount={teachers.length}
          totalAllottedLoad={totalAllottedLoad}
          totalSchoolSubjectPeriods={totalSchoolDemand}
          totalAssignedSubjects={totalAssignedSubjects}
          unassignedSubjects={unassignedSubjects}
          totalSchoolSubjects={totalSchoolSubjects}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
              <th className="py-2.5 px-4 w-1/5">Teacher Name</th>
              <th className="py-2.5 px-4 w-16">Code</th>
              <th className="py-2.5 px-4 w-28">Subject</th>
              <th className="py-2.5 px-4 w-32">Class Teacher</th>
              <th className="py-2.5 px-4">Eligible Classes, Sections & Subjects</th>
              <th className="py-2.5 px-4 w-20">Capacity</th>
              <th className="py-2.5 px-4 w-24">Workload</th>
              <th className="py-2.5 px-4 text-right w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <span>No teaching staff configured. Click &quot;Add Teacher&quot; above to begin.</span>
                </td>
              </tr>
            ) : (
              teachers.map((t) => (
                <TeacherTableRow
                  key={t.id}
                  teacher={t}
                  load={teacherLoadMap[t.id] || 0}
                  groupChips={groupChipsByTeacher[t.id]}
                  groupMemberNames={groupMemberNamesByClass}
                  subjects={subjects}
                  classTotalSubjectsMap={classTotalSubjectsMap}
                  settings={settings}
                  isEditing={isEditorOpen && editingTeacherId === t.id}
                  onEdit={handleEdit}
                  onDelete={onDeleteTeacher ? handleDelete : undefined}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
