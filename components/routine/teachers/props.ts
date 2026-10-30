import { RoutineTeacher, RoutineSettings, RoutineClass, RoutineSubject, RoutineSubjectGroup } from "@/lib/routine/types";


export interface RoutineTeachersTabProps {
  teachers: RoutineTeacher[];
  settings: RoutineSettings;
  classes?: RoutineClass[];
  subjects?: RoutineSubject[];
  groups?: RoutineSubjectGroup[];
  onSaveGroup?: (group: RoutineSubjectGroup) => Promise<void>;
  onSaveTeacher: (teacher: RoutineTeacher) => Promise<void>;
  onDeleteTeacher?: (id: string) => Promise<void>;
}
