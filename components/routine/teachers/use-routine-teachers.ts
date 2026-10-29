"use client";

import { useTeachersCore } from "./use-teachers-core";
import { useTeachersEditor } from "./use-teachers-editor";
import { useTeachersAllocation } from "./use-teachers-allocation";
import { useTeachersSave } from "./use-teachers-save";
import type { RoutineTeachersTabProps } from "./props";

export function useRoutineTeachers(props: RoutineTeachersTabProps) {
  const core = useTeachersCore(props);
  const editor = useTeachersEditor(core);
  const alloc = useTeachersAllocation(core);
  const save = useTeachersSave({ ...core, ...alloc });

  return { ...core, ...editor, ...alloc, ...save };
}

export type RoutineTeachersState = ReturnType<typeof useRoutineTeachers>;
