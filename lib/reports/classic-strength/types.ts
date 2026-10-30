
export interface SectionMatrixRow {
  classLevel: string; // "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
  section: string; // "A", "B", ""
  displayLabel: string; // "V-A", "V-B", "XI"
  boysHindu: number;
  boysMuslim: number;
  totalBoys: number;
  boysInClass: number; // class subtotal
  girlsHindu: number;
  girlsMuslim: number;
  totalGirls: number;
  girlsInClass: number; // class subtotal
  totalHindu: number; // class total hindu
  totalMuslim: number; // class total muslim
  totalStudents: number; // section total
  studentsInClass: number; // class total
  isFirstInSection: boolean;
  sectionCountInClass: number;
  stageGroup: "V-VIII" | "IX-X" | "XI-XII";
  stageTotal: number;
  isFirstInStage: boolean;
  stageRowCount: number;
}

export interface ClassSummaryRow {
  classLevel: string;
  boysHindu: number;
  boysMuslim: number;
  totalBoys: number;
  girlsHindu: number;
  girlsMuslim: number;
  totalGirls: number;
  totalHindu: number;
  totalMuslim: number;
  totalStudents: number;
}

export interface DifferentialGroup {
  label: string;
  boys: number;
  girls: number;
  hindu: number;
  muslim: number;
  total: number;
}

export interface ClassicReportData {
  schoolName: string;
  reportTitle: string;
  asOnDate: string;
  academicYear: string;
  sectionRows: SectionMatrixRow[];
  totals: {
    boysHindu: number;
    boysMuslim: number;
    totalBoys: number;
    girlsHindu: number;
    girlsMuslim: number;
    totalGirls: number;
    totalHindu: number;
    totalMuslim: number;
    totalStudents: number;
  };
  classSummaries: ClassSummaryRow[];
  differentials: DifferentialGroup[];
}
