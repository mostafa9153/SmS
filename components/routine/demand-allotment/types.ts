


export interface ClassAllotmentRow {
  classId: string;
  className: string;
  section: string;
  stream: string | null;
  isHs: boolean;
  subjectsCount: number;
  demandPeriods: number;
  capacityPeriods: number;
  assignedPeriods: number;
  gap: number; // assignedPeriods - demandPeriods
  capacityGap: number; // capacityPeriods - demandPeriods
  status: "balanced" | "under_allotted" | "over_capacity" | "deficit";
  subjectList: {
    id: string;
    name: string;
    stream?: string | null;
    isCommon?: boolean;
    periods: number;
    assignedTeacher?: string | null;
    assignedTeachers?: { teacherId: string; name: string; shortName?: string; periods: number }[];
    assignedPeriods: number;
  }[];
}
