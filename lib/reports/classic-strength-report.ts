import * as XLSX from "xlsx";
import type { Student } from "@/lib/types";

export interface SectionMatrixRow {
  classLevel: string;      // e.g. "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
  section: string;         // e.g. "A", "B", ""
  displayLabel: string;    // e.g. "V-A", "V-B", "XI"
  boysHindu: number;
  boysMuslim: number;
  boysOther: number;
  totalBoys: number;
  boysInClass: number;     // subtotal for class
  girlsHindu: number;
  girlsMuslim: number;
  girlsOther: number;
  totalGirls: number;
  girlsInClass: number;    // subtotal for class
  totalHindu: number;
  totalMuslim: number;
  totalOther: number;
  totalStudents: number;
  studentsInClass: number; // subtotal for class
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

/**
 * Standard class order for High Schools in West Bengal (V to XII)
 */
const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function isMuslim(religion?: string): boolean {
  if (!religion) return false;
  const r = religion.trim().toLowerCase();
  return r === "islam" || r === "muslim" || r.includes("islam") || r.includes("muslim");
}

function isHindu(religion?: string): boolean {
  if (!religion) return false;
  const r = religion.trim().toLowerCase();
  return r === "hindu" || r === "hinduism" || r.includes("hindu");
}

export function computeClassicStrengthData(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = "2026"
): ClassicReportData {
  // Only include active continuing students
  const activeStudents = students.filter(
    (s) => s.currentStatus === "Continuing" || !s.currentStatus
  );

  // Group by Class and Section
  const classOrderMap = new Map<string, number>();
  STANDARD_CLASSES.forEach((c, idx) => classOrderMap.set(c, idx));

  // Determine all existing Class & Section combos
  const combos = new Map<string, { classLevel: string; section: string; students: Student[] }>();

  // Ensure standard sections exist in predefined order
  const standardLayout = [
    { classLevel: "V", section: "A" },
    { classLevel: "V", section: "B" },
    { classLevel: "VI", section: "A" },
    { classLevel: "VI", section: "B" },
    { classLevel: "VII", section: "A" },
    { classLevel: "VII", section: "B" },
    { classLevel: "VIII", section: "A" },
    { classLevel: "VIII", section: "B" },
    { classLevel: "IX", section: "A" },
    { classLevel: "IX", section: "B" },
    { classLevel: "X", section: "A" },
    { classLevel: "XI", section: "" },
    { classLevel: "XII", section: "" },
  ];

  standardLayout.forEach((item) => {
    const key = `${item.classLevel}__${item.section}`;
    combos.set(key, { classLevel: item.classLevel, section: item.section, students: [] });
  });

  // Assign students to combos
  activeStudents.forEach((student) => {
    const c = (student.presentClass || "V").toUpperCase().trim();
    const s = (student.presentSection || "").toUpperCase().trim();
    const key = `${c}__${s}`;

    if (!combos.has(key)) {
      combos.set(key, { classLevel: c, section: s, students: [] });
    }
    combos.get(key)!.students.push(student);
  });

  // Calculate totals per class first (for subtotal columns)
  const classTotals = new Map<string, { boys: number; girls: number; total: number }>();
  activeStudents.forEach((student) => {
    const c = (student.presentClass || "V").toUpperCase().trim();
    if (!classTotals.has(c)) {
      classTotals.set(c, { boys: 0, girls: 0, total: 0 });
    }
    const ct = classTotals.get(c)!;
    ct.total += 1;
    if (student.gender === "Male") ct.boys += 1;
    else if (student.gender === "Female") ct.girls += 1;
  });

  // Build Section Matrix Rows
  const sectionRows: SectionMatrixRow[] = [];

  // Sort combos by class order and section
  const sortedCombos = Array.from(combos.entries()).sort((a, b) => {
    const orderA = classOrderMap.has(a[1].classLevel) ? classOrderMap.get(a[1].classLevel)! : 99;
    const orderB = classOrderMap.has(b[1].classLevel) ? classOrderMap.get(b[1].classLevel)! : 99;
    if (orderA !== orderB) return orderA - orderB;
    return a[1].section.localeCompare(b[1].section);
  });

  for (const [, item] of sortedCombos) {
    const list = item.students;
    const displayLabel = item.section ? `${item.classLevel}-${item.section}` : item.classLevel;

    let boysHindu = 0;
    let boysMuslim = 0;
    let boysOther = 0;
    let girlsHindu = 0;
    let girlsMuslim = 0;
    let girlsOther = 0;

    list.forEach((s) => {
      const isM = s.gender === "Male";
      const isF = s.gender === "Female";
      const hindu = isHindu(s.religion);
      const muslim = isMuslim(s.religion);

      if (isM) {
        if (hindu) boysHindu++;
        else if (muslim) boysMuslim++;
        else boysOther++;
      } else if (isF) {
        if (hindu) girlsHindu++;
        else if (muslim) girlsMuslim++;
        else girlsOther++;
      }
    });

    const totalBoys = boysHindu + boysMuslim + boysOther;
    const totalGirls = girlsHindu + girlsMuslim + girlsOther;
    const totalHindu = boysHindu + girlsHindu;
    const totalMuslim = boysMuslim + girlsMuslim;
    const totalOther = boysOther + girlsOther;
    const totalStudents = list.length;

    const cTotals = classTotals.get(item.classLevel) || { boys: totalBoys, girls: totalGirls, total: totalStudents };

    sectionRows.push({
      classLevel: item.classLevel,
      section: item.section,
      displayLabel,
      boysHindu,
      boysMuslim,
      boysOther,
      totalBoys,
      boysInClass: cTotals.boys,
      girlsHindu,
      girlsMuslim,
      girlsOther,
      totalGirls,
      girlsInClass: cTotals.girls,
      totalHindu,
      totalMuslim,
      totalOther,
      totalStudents,
      studentsInClass: cTotals.total,
    });
  }

  // Grand Totals
  const totals = {
    boysHindu: sectionRows.reduce((sum, r) => sum + r.boysHindu, 0),
    boysMuslim: sectionRows.reduce((sum, r) => sum + r.boysMuslim, 0),
    totalBoys: sectionRows.reduce((sum, r) => sum + r.totalBoys, 0),
    girlsHindu: sectionRows.reduce((sum, r) => sum + r.girlsHindu, 0),
    girlsMuslim: sectionRows.reduce((sum, r) => sum + r.girlsMuslim, 0),
    totalGirls: sectionRows.reduce((sum, r) => sum + r.totalGirls, 0),
    totalHindu: sectionRows.reduce((sum, r) => sum + r.totalHindu, 0),
    totalMuslim: sectionRows.reduce((sum, r) => sum + r.totalMuslim, 0),
    totalStudents: sectionRows.reduce((sum, r) => sum + r.totalStudents, 0),
  };

  // Class-wise Summary (V to XII)
  const classSummaries: ClassSummaryRow[] = STANDARD_CLASSES.map((c) => {
    const rows = sectionRows.filter((r) => r.classLevel === c);
    const bH = rows.reduce((s, r) => s + r.boysHindu, 0);
    const bM = rows.reduce((s, r) => s + r.boysMuslim, 0);
    const tB = rows.reduce((s, r) => s + r.totalBoys, 0);
    const gH = rows.reduce((s, r) => s + r.girlsHindu, 0);
    const gM = rows.reduce((s, r) => s + r.girlsMuslim, 0);
    const tG = rows.reduce((s, r) => s + r.totalGirls, 0);
    const tH = bH + gH;
    const tM = bM + gM;
    const tS = tB + tG;

    return {
      classLevel: c,
      boysHindu: bH,
      boysMuslim: bM,
      totalBoys: tB,
      girlsHindu: gH,
      girlsMuslim: gM,
      totalGirls: tG,
      totalHindu: tH,
      totalMuslim: tM,
      totalStudents: tS,
    };
  });

  // Differentials / Stage Grouping
  const getGroupSum = (classes: string[]) => {
    const items = classSummaries.filter((cs) => classes.includes(cs.classLevel));
    const boys = items.reduce((s, i) => s + i.totalBoys, 0);
    const girls = items.reduce((s, i) => s + i.totalGirls, 0);
    const hindu = items.reduce((s, i) => s + i.totalHindu, 0);
    const muslim = items.reduce((s, i) => s + i.totalMuslim, 0);
    const total = items.reduce((s, i) => s + i.totalStudents, 0);
    return { boys, girls, hindu, muslim, total };
  };

  const differentials: DifferentialGroup[] = [
    { label: "V to VIII-", ...getGroupSum(["V", "VI", "VII", "VIII"]) },
    { label: "V to X-", ...getGroupSum(["V", "VI", "VII", "VIII", "IX", "X"]) },
    { label: "V to XII-", ...getGroupSum(["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]) },
    { label: "VI to VIII-", ...getGroupSum(["VI", "VII", "VIII"]) },
    { label: "IX to X-", ...getGroupSum(["IX", "X"]) },
    { label: "XI to XII-", ...getGroupSum(["XI", "XII"]) },
    {
      label: "Total Hindu/Muslim",
      boys: totals.totalBoys,
      girls: totals.totalGirls,
      hindu: totals.totalHindu,
      muslim: totals.totalMuslim,
      total: totals.totalStudents,
    },
  ];

  const today = customDate || new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  return {
    schoolName,
    reportTitle: `STUDENTS STRENGTH ${academicYear} As On ${today}`,
    asOnDate: today,
    academicYear,
    sectionRows,
    totals,
    classSummaries,
    differentials,
  };
}

/**
 * Generates and downloads the Excel workbook with Classic Matrix formatting
 */
export function exportClassicStrengthExcel(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = "2026"
) {
  const data = computeClassicStrengthData(students, schoolName, customDate, academicYear);

  const aoa: any[][] = [];

  // Title Block
  aoa.push([data.schoolName]);
  aoa.push([data.reportTitle]);
  aoa.push([]); // blank line

  // Main Matrix Header
  aoa.push([
    "Class",
    "Boys",
    "",
    "",
    "",
    "Girls",
    "",
    "",
    "",
    "Total Hindu",
    "Total Muslim",
    "Total Students",
    "Students in Class",
  ]);

  aoa.push([
    "",
    "Hindu",
    "Muslim",
    "Total Boys",
    "Boys in Class",
    "Hindu",
    "Muslim",
    "Total Girls",
    "Girls in Class",
    "",
    "",
    "",
    "",
  ]);

  // Section Rows
  data.sectionRows.forEach((r) => {
    aoa.push([
      r.displayLabel,
      r.boysHindu,
      r.boysMuslim,
      r.totalBoys,
      r.boysInClass,
      r.girlsHindu,
      r.girlsMuslim,
      r.totalGirls,
      r.girlsInClass,
      r.totalHindu,
      r.totalMuslim,
      r.totalStudents,
      r.studentsInClass,
    ]);
  });

  // Main Totals Row
  aoa.push([
    "Total",
    data.totals.boysHindu,
    data.totals.boysMuslim,
    data.totals.totalBoys,
    data.totals.totalBoys,
    data.totals.girlsHindu,
    data.totals.girlsMuslim,
    data.totals.totalGirls,
    data.totals.totalGirls,
    data.totals.totalHindu,
    data.totals.totalMuslim,
    data.totals.totalStudents,
    data.totals.totalStudents,
  ]);

  aoa.push([]);
  aoa.push([]);

  // Section 2: Class Summary Breakdown Table
  aoa.push(["CLASS-WISE BREAKDOWN SUMMARY"]);
  aoa.push(["Class", "Boys (Hindu)", "Boys (Muslim)", "Total Boys", "Girls (Hindu)", "Girls (Muslim)", "Total Girls", "Total Hindu", "Total Muslim", "Total Students"]);

  data.classSummaries.forEach((cs) => {
    aoa.push([
      `Class ${cs.classLevel}`,
      cs.boysHindu,
      cs.boysMuslim,
      cs.totalBoys,
      cs.girlsHindu,
      cs.girlsMuslim,
      cs.totalGirls,
      cs.totalHindu,
      cs.totalMuslim,
      cs.totalStudents,
    ]);
  });

  aoa.push([
    "Total",
    data.totals.boysHindu,
    data.totals.boysMuslim,
    data.totals.totalBoys,
    data.totals.girlsHindu,
    data.totals.girlsMuslim,
    data.totals.totalGirls,
    data.totals.totalHindu,
    data.totals.totalMuslim,
    data.totals.totalStudents,
  ]);

  aoa.push([]);
  aoa.push([]);

  // Section 3: Stage Differentials Table
  aoa.push(["STAGE / LEVEL DIFFERENTIALS (DEFERENCIALS)"]);
  aoa.push(["Deferencials", "Boys", "Girls", "Hindu", "Muslim", "Total Student"]);

  data.differentials.forEach((d) => {
    aoa.push([
      d.label,
      d.boys,
      d.girls,
      d.hindu,
      d.muslim,
      d.total,
    ]);
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths for readability
  ws["!cols"] = [
    { wch: 18 }, // Class
    { wch: 14 }, // Boys Hindu
    { wch: 14 }, // Boys Muslim
    { wch: 14 }, // Total Boys
    { wch: 16 }, // Boys in Class
    { wch: 14 }, // Girls Hindu
    { wch: 14 }, // Girls Muslim
    { wch: 14 }, // Total Girls
    { wch: 16 }, // Girls in Class
    { wch: 14 }, // Total Hindu
    { wch: 14 }, // Total Muslim
    { wch: 16 }, // Total Students
    { wch: 18 }, // Students in Class
  ];

  // Create workbook and write
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students Strength Matrix");

  const filename = `Students_Strength_Matrix_${data.academicYear}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
