"use client";



import { TeachersHeaderCard } from "@/components/routine/teachers/teachers-header-card";
import { TeacherEditorDialog } from "@/components/routine/teachers/teacher-editor-dialog";
import { TeachersListTable } from "@/components/routine/teachers/teachers-list-table";
import { useRoutineTeachers } from "@/components/routine/teachers/use-routine-teachers";
import type { RoutineTeachersTabProps } from "@/components/routine/teachers/props";

export function RoutineTeachersTab(props: RoutineTeachersTabProps) {
  const rt = useRoutineTeachers(props);

  return (
    <div className="space-y-4 w-full">
      {/* Top Header Card: Add Teacher Button & Save to Cloud */}
      <TeachersHeaderCard rt={rt} />

      {/* Faculty Editor Dialog Popup (Modal for Add & Edit) */}
      <TeacherEditorDialog rt={rt} />

      {/* Teachers List Table */}
      <TeachersListTable rt={rt} />
    </div>
  );
}
