"use client";

import { useSubjectsCore } from "./use-subjects-core";
import { useSubjectsDerived } from "./use-subjects-derived";
import { useSubjectsEditing } from "./use-subjects-editing";
import { useSubjectsSync } from "./use-subjects-sync";
import type { RoutineSubjectsTabProps } from "./props";

export function useRoutineSubjects(props: RoutineSubjectsTabProps) {
  const core = useSubjectsCore(props);
  const derived = useSubjectsDerived(core);
  const editing = useSubjectsEditing({ ...core, ...derived });
  const sync = useSubjectsSync({ ...core, ...editing });

  return { ...core, ...derived, ...editing, ...sync };
}

export type RoutineSubjectsState = ReturnType<typeof useRoutineSubjects>;
