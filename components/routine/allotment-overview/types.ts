


export interface TeacherAssignmentItem {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  periods: number;
  subjectName: string;
  isLab?: boolean;
}

export interface CellAllotmentData {
  subjectName: string;
  demandPeriods: number;
  assignedPeriods: number;
  teachers: TeacherAssignmentItem[];
  status: "balanced" | "missing" | "overflow" | "unconfigured";
  missingCount: number;
  overflowCount: number;
}

export interface ClassRowData {
  classId: string;
  className: string;
  section: string;
  label: string;
  numericRank: number;
  cells: Record<string, CellAllotmentData>;
  totalClassDemand: number;
  totalClassAssigned: number;
  hasIssues: boolean;
}

