
export interface AssessmentTerm {
  periodic: number | "";      // Written assessment
  preparatory: number | "";   // Oral / Formative / Project assessment
  total: number;
}

export interface SubjectMarksheetRow {
  id: string;
  subjectName: string;
  term1: AssessmentTerm;       // 1st Summative Evaluation: 40 + 10 = 50 (or per class scheme)
  term2: AssessmentTerm;       // 2nd Summative Evaluation: 40 + 10 = 50
  term3: AssessmentTerm;       // 3rd Summative Evaluation: 90 + 10 = 100
  overallTotal: number;        // Out of 200
  percentage: number;          // Out of 100%
  grade: string;               // AA, A+, A, B+, B, C, D
  highestMarksInClass?: number | ""; // Highest in class / 1st boy marks comparison
}

export interface MarksheetData {
  academicYear: string;        // "2026"
  studentName: string;
  studentClass: string;        // "IX", "V", "VI", etc.
  section?: string;            // Optional
  rollNo: string;              // "01"
  studentId: string;           // "MHS-2026-0036"
  registrationNo?: string;
  penNumber?: string;
  guardianName?: string;
  subjects: SubjectMarksheetRow[];
  classTeacherName?: string;
  issueDate: string;
  promotionStatus: "PROMOTED" | "PASSED" | "DETAINED" | "ELIGIBLE";
  promotedToClass: string;
  classRank?: string;          // e.g. "1st", "2nd", "3rd", "10th"
  attendanceDays?: number;
  totalWorkingDays?: number;
}

export interface GradeScaleEntry {
  range: string;
  grade: string;
  remarks: string;
}
