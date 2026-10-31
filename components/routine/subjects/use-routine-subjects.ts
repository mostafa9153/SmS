"use client";

import { useSubjectsCore } from "./use-subjects-core";
import { useSubjectsDerived } from "./use-subjects-derived";
import { useSubjectsEditing } from "./use-subjects-editing";
import { useSubjectsSync } from "./use-subjects-sync";
import { useSubjectSchedule } from "./use-subject-schedule";
import type { RoutineSubjectsTabProps } from "./props";

export function useRoutineSubjects(props: RoutineSubjectsTabProps) {
  const core = useSubjectsCore(props);
  const derived = useSubjectsDerived(core);
  const schedule = useSubjectSchedule(core);
  const editing = useSubjectsEditing({ ...core, ...derived, ...schedule });
  const sync = useSubjectsSync({ ...core, ...editing });

  return { ...core, ...derived, ...schedule, ...editing, ...sync };
}

export type RoutineSubjectsState = ReturnType<typeof useRoutineSubjects>;
