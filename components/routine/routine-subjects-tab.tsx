"use client";

import { HS_STREAM_PRESETS, detectSubjectStream, isHsClass, getConfiguredStreamsForClass, parseSectionAndStream } from "@/lib/routine/routine-helpers";

import { ClassSwitcher } from "@/components/routine/subjects/class-switcher";
import { SubjectsTable } from "@/components/routine/subjects/subjects-table";
import { SubjectDialog } from "@/components/routine/subjects/subject-dialog";
import { useRoutineSubjects } from "@/components/routine/subjects/use-routine-subjects";
import type { RoutineSubjectsTabProps } from "@/components/routine/subjects/props";

export {
  HS_STREAM_PRESETS,
  detectSubjectStream,
  isHsClass,
  getConfiguredStreamsForClass,
  parseSectionAndStream,
};


export function RoutineSubjectsTab(props: RoutineSubjectsTabProps) {
  const tab = useRoutineSubjects(props);

  return (
    <div className="space-y-4 w-full">
      {/* 1. Class Segmented Switcher Tabs */}
      <ClassSwitcher tab={tab} />

      {/* 3. Subjects Table for Active Class */}
      <SubjectsTable tab={tab} />

      {/* Add / Edit Subject Dialog */}
      <SubjectDialog tab={tab} />
    </div>
  );
}
