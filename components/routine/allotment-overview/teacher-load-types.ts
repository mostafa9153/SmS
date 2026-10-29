


export interface TeacherLoadRowData {
  teacherId: string;
  teacherIndex: number;
  teacherCode: string;
  name: string;
  shortName: string;
  primarySubject: string;
  maxPeriods: number;
  totalAssignedPeriods: number;
  assignedClasses: {
    className: string;
    section: string;
    label: string;
    subject: string;
    periods: number;
  }[];
  status: "balanced" | "underloaded" | "overloaded" | "idle";
  overloadCount: number;
  hasIssues: boolean;
}
