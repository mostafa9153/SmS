import { RoutineSubject, RoutineClass, RoutineSubjectGroup, RoutineSettings } from "@/lib/routine/types";


export interface RoutineSubjectsTabProps {
  subjects: RoutineSubject[];
  settings: RoutineSettings;
  classes?: RoutineClass[];
  groups?: RoutineSubjectGroup[];
  onSaveGroup?: (group: RoutineSubjectGroup) => Promise<void>;
  onDeleteGroup?: (id: string) => Promise<void>;
  onSaveSubject: (subj: {
    id?: string;
    name: string;
    className?: string | null;
    classId?: string | null;
    stream?: string | null;
    isCommon?: boolean;
    isHard?: boolean;
    isLab?: boolean;
    theoryPeriods?: number | null;
    labPeriods?: number | null;
    timePref?: "any" | "morning" | "afternoon";
    allowMultiplePerDay?: boolean;
    maxPerDay?: number | null;
    periodsPerWeek?: number | null;
    sortOrder?: number | null;
    allowedSlots?: Record<string, number[]> | null;
  }) => Promise<void>;
  onBatchSaveSubjects?: (subjects: {
    id?: string;
    name: string;
    className?: string | null;
    classId?: string | null;
    stream?: string | null;
    isCommon?: boolean;
    isHard?: boolean;
    isLab?: boolean;
    timePref?: "any" | "morning" | "afternoon";
    allowMultiplePerDay?: boolean;
    maxPerDay?: number | null;
    periodsPerWeek?: number | null;
    sortOrder?: number | null;
  }[]) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
}
