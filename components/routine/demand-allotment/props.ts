import { RoutineClass, RoutineSubject, RoutineTeacher, RoutineAssignment, RoutineSettings, RoutineSubjectGroup } from "@/lib/routine/types";


export interface RoutineDemandAllotmentTabProps {
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  assignments: RoutineAssignment[];
  settings: RoutineSettings;
  groups?: RoutineSubjectGroup[];
}
