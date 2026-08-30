import type ExcelJS from "exceljs";
import type { TableRow, TableCell } from "docx";
import type { Student } from "@/lib/types";

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
  const activeStudents = students.filter(
    (s) => s.currentStatus === "Continuing" || !s.currentStatus
  );

  const standardLayout = [
    { classLevel: "V", section: "A", label: "V-A", stage: "V-VIII" as const },
    { classLevel: "V", section: "B", label: "V-B", stage: "V-VIII" as const },
    { classLevel: "VI", section: "A", label: "VI-A", stage: "V-VIII" as const },
    { classLevel: "VI", section: "B", label: "VI-B", stage: "V-VIII" as const },
    { classLevel: "VII", section: "A", label: "VII-A", stage: "V-VIII" as const },
    { classLevel: "VII", section: "B", label: "VII-B", stage: "V-VIII" as const },
    { classLevel: "VIII", section: "A", label: "VIII-A", stage: "V-VIII" as const },
    { classLevel: "VIII", section: "B", label: "VIII-B", stage: "V-VIII" as const },
    { classLevel: "IX", section: "A", label: "IX A", stage: "IX-X" as const },
    { classLevel: "IX", section: "B", label: "IX B", stage: "IX-X" as const },
    { classLevel: "X", section: "A", label: "X-A", stage: "IX-X" as const },
    { classLevel: "XI", section: "", label: "XI", stage: "XI-XII" as const },
    { classLevel: "XII", section: "", label: "XII", stage: "XI-XII" as const },
  ];

  // Map students to sections
  const comboMap = new Map<string, Student[]>();
  standardLayout.forEach((item) => {
    comboMap.set(`${item.classLevel}__${item.section}`, []);
  });

  activeStudents.forEach((student) => {
    const c = (student.presentClass || "V").toUpperCase().trim();
    const s = (student.presentSection || "").toUpperCase().trim();
    const key = `${c}__${s}`;
    if (comboMap.has(key)) {
      comboMap.get(key)!.push(student);
    } else {
      const fallbackKey = `${c}__A`;
      if (comboMap.has(fallbackKey)) {
        comboMap.get(fallbackKey)!.push(student);
      } else {
        const firstKey = `${c}__`;
        if (comboMap.has(firstKey)) {
          comboMap.get(firstKey)!.push(student);
        }
      }
    }
  });

  // Calculate Class Subtotals
  const classTotals = new Map<
    string,
    { boysH: number; boysM: number; boys: number; girlsH: number; girlsM: number; girls: number; hindu: number; muslim: number; total: number }
  >();

  STANDARD_CLASSES.forEach((c) => {
    classTotals.set(c, {
      boysH: 0,
      boysM: 0,
      boys: 0,
      girlsH: 0,
      girlsM: 0,
      girls: 0,
      hindu: 0,
      muslim: 0,
      total: 0,
    });
  });

  standardLayout.forEach((item) => {
    const list = comboMap.get(`${item.classLevel}__${item.section}`) || [];
    const ct = classTotals.get(item.classLevel)!;
    list.forEach((s) => {
      const isM = s.gender === "Male";
      const isF = s.gender === "Female";
      const hindu = isHindu(s.religion);
      const muslim = isMuslim(s.religion);

      if (isM) {
        ct.boys++;
        if (hindu) ct.boysH++;
        else if (muslim) ct.boysM++;
      } else if (isF) {
        ct.girls++;
        if (hindu) ct.girlsH++;
        else if (muslim) ct.girlsM++;
      }
      if (hindu) ct.hindu++;
      else if (muslim) ct.muslim++;
      ct.total++;
    });
  });

  // Calculate Stage Totals
  const stageSums = {
    "V-VIII": ["V", "VI", "VII", "VIII"].reduce((s, c) => s + classTotals.get(c)!.total, 0),
    "IX-X": ["IX", "X"].reduce((s, c) => s + classTotals.get(c)!.total, 0),
    "XI-XII": ["XI", "XII"].reduce((s, c) => s + classTotals.get(c)!.total, 0),
  };

  // Build section matrix rows with vertical merge metadata
  const sectionRows: SectionMatrixRow[] = [];
  const classSeen = new Set<string>();
  const stageSeen = new Set<string>();

  const stageCounts = {
    "V-VIII": standardLayout.filter((x) => x.stage === "V-VIII").length,
    "IX-X": standardLayout.filter((x) => x.stage === "IX-X").length,
    "XI-XII": standardLayout.filter((x) => x.stage === "XI-XII").length,
  };

  standardLayout.forEach((item) => {
    const list = comboMap.get(`${item.classLevel}__${item.section}`) || [];
    let boysHindu = 0;
    let boysMuslim = 0;
    let girlsHindu = 0;
    let girlsMuslim = 0;

    list.forEach((s) => {
      const isM = s.gender === "Male";
      const isF = s.gender === "Female";
      const hindu = isHindu(s.religion);
      const muslim = isMuslim(s.religion);

      if (isM) {
        if (hindu) boysHindu++;
        else if (muslim) boysMuslim++;
      } else if (isF) {
        if (hindu) girlsHindu++;
        else if (muslim) girlsMuslim++;
      }
    });

    const totalBoys = boysHindu + boysMuslim;
    const totalGirls = girlsHindu + girlsMuslim;
    const totalStudents = list.length;
    const ct = classTotals.get(item.classLevel)!;

    const isFirstInSection = !classSeen.has(item.classLevel);
    classSeen.add(item.classLevel);

    const sectionCountInClass = standardLayout.filter((x) => x.classLevel === item.classLevel).length;

    const isFirstInStage = !stageSeen.has(item.stage);
    stageSeen.add(item.stage);

    sectionRows.push({
      classLevel: item.classLevel,
      section: item.section,
      displayLabel: item.label,
      boysHindu,
      boysMuslim,
      totalBoys,
      boysInClass: ct.boys,
      girlsHindu,
      girlsMuslim,
      totalGirls,
      girlsInClass: ct.girls,
      totalHindu: ct.hindu,
      totalMuslim: ct.muslim,
      totalStudents,
      studentsInClass: ct.total,
      isFirstInSection,
      sectionCountInClass,
      stageGroup: item.stage,
      stageTotal: stageSums[item.stage],
      isFirstInStage,
      stageRowCount: stageCounts[item.stage],
    });
  });

  // Grand Totals
  const totals = {
    boysHindu: sectionRows.reduce((s, r) => s + r.boysHindu, 0),
    boysMuslim: sectionRows.reduce((s, r) => s + r.boysMuslim, 0),
    totalBoys: sectionRows.reduce((s, r) => s + r.totalBoys, 0),
    girlsHindu: sectionRows.reduce((s, r) => s + r.girlsHindu, 0),
    girlsMuslim: sectionRows.reduce((s, r) => s + r.girlsMuslim, 0),
    totalGirls: sectionRows.reduce((s, r) => s + r.totalGirls, 0),
    totalHindu: Array.from(classTotals.values()).reduce((s, c) => s + c.hindu, 0),
    totalMuslim: Array.from(classTotals.values()).reduce((s, c) => s + c.muslim, 0),
    totalStudents: sectionRows.reduce((s, r) => s + r.totalStudents, 0),
  };

  // Class-Wise Summaries
  const classSummaries: ClassSummaryRow[] = STANDARD_CLASSES.map((c) => {
    const ct = classTotals.get(c)!;
    return {
      classLevel: c,
      boysHindu: ct.boysH,
      boysMuslim: ct.boysM,
      totalBoys: ct.boys,
      girlsHindu: ct.girlsH,
      girlsMuslim: ct.girlsM,
      totalGirls: ct.girls,
      totalHindu: ct.hindu,
      totalMuslim: ct.muslim,
      totalStudents: ct.total,
    };
  });

  // Differentials
  const getDiff = (classes: string[], label: string) => {
    const items = classSummaries.filter((cs) => classes.includes(cs.classLevel));
    return {
      label,
      boys: items.reduce((s, i) => s + i.totalBoys, 0),
      girls: items.reduce((s, i) => s + i.totalGirls, 0),
      hindu: items.reduce((s, i) => s + i.totalHindu, 0),
      muslim: items.reduce((s, i) => s + i.totalMuslim, 0),
      total: items.reduce((s, i) => s + i.totalStudents, 0),
    };
  };

  const differentials: DifferentialGroup[] = [
    getDiff(["V", "VI", "VII", "VIII"], "V to VIII-"),
    getDiff(["V", "VI", "VII", "VIII", "IX", "X"], "V to X-"),
    getDiff(["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"], "V to XII-"),
    getDiff(["VI", "VII", "VIII"], "VI to VIII"),
    getDiff(["IX", "X"], "IX to X-"),
    getDiff(["XI", "XII"], "XI to XII-"),
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

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT USING EXCELJS (Colors, Borders, Fonts, Merges, Centering)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportClassicStrengthExcel(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = "2026"
) {
  const data = computeClassicStrengthData(students, schoolName, customDate, academicYear);
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("STUDENTS STRENGTH", {
    views: [{ showGridLines: true }],
  });

  // Fonts & Colors (ARGB)
  const MAROON = "FF800000";
  const NAVY = "FF002060";
  const GREEN = "FF008000";
  const DARK_GREEN = "FF006600";
  const RED = "FFC00000";
  const PURPLE = "FF7030A0";
  const BLUE = "FF004080";
  const OLIVE = "FF4F6228";

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  const centerMiddle: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  // Row 1: School Name
  const r1 = ws.addRow([data.schoolName]);
  r1.height = 30;
  ws.mergeCells("A1:N1");
  const c1 = ws.getCell("A1");
  c1.font = { name: "Times New Roman", size: 16, bold: true, color: { argb: MAROON } };
  c1.alignment = centerMiddle;

  // Row 2: Subtitle
  const r2 = ws.addRow([data.reportTitle]);
  r2.height = 24;
  ws.mergeCells("A2:N2");
  const c2 = ws.getCell("A2");
  c2.font = { name: "Times New Roman", size: 13, bold: true, italic: true, color: { argb: NAVY } };
  c2.alignment = centerMiddle;

  // Row 3 & 4: Top Table Headers
  const r3 = ws.addRow([
    "",
    "Boys",
    "",
    "Total Boys",
    "Boys in Class",
    "Girls",
    "",
    "Total Girls",
    "Girls in Class",
    "Total Hindu",
    "Total Muslim",
    "Total Students",
    "Students in Class",
    "Total Student",
  ]);
  r3.height = 24;

  const r4 = ws.addRow([
    "",
    "Hindu",
    "Muslim",
    "",
    "",
    "Hindu",
    "Muslim",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  r4.height = 22;

  // Header Merges
  ws.mergeCells("B3:C3"); // Boys
  ws.mergeCells("F3:G3"); // Girls
  ws.mergeCells("A3:A4"); // Class
  ws.mergeCells("D3:D4"); // Total Boys
  ws.mergeCells("E3:E4"); // Boys in Class
  ws.mergeCells("H3:H4"); // Total Girls
  ws.mergeCells("I3:I4"); // Girls in Class
  ws.mergeCells("J3:J4"); // Total Hindu
  ws.mergeCells("K3:K4"); // Total Muslim
  ws.mergeCells("L3:L4"); // Total Students
  ws.mergeCells("M3:M4"); // Students in Class
  ws.mergeCells("N3:N4"); // Total Student

  // Header Styling
  ws.getCell("B3").font = { name: "Calibri", size: 12, bold: true, color: { argb: GREEN } };
  ws.getCell("B4").font = { name: "Calibri", size: 11, bold: true, color: { argb: NAVY } };
  ws.getCell("C4").font = { name: "Calibri", size: 11, bold: true, color: { argb: GREEN } };
  ws.getCell("D3").font = { name: "Calibri", size: 11, bold: true, color: { argb: GREEN } };
  ws.getCell("E3").font = { name: "Calibri", size: 11, bold: true, color: { argb: DARK_GREEN } };

  ws.getCell("F3").font = { name: "Calibri", size: 12, bold: true, color: { argb: RED } };
  ws.getCell("F4").font = { name: "Calibri", size: 11, bold: true, color: { argb: RED } };
  ws.getCell("G4").font = { name: "Calibri", size: 11, bold: true, color: { argb: GREEN } };
  ws.getCell("H3").font = { name: "Calibri", size: 11, bold: true, color: { argb: RED } };
  ws.getCell("I3").font = { name: "Calibri", size: 11, bold: true, color: { argb: MAROON } };

  ws.getCell("J3").font = { name: "Calibri", size: 11, bold: true, color: { argb: NAVY } };
  ws.getCell("K3").font = { name: "Calibri", size: 11, bold: true, color: { argb: GREEN } };
  ws.getCell("L3").font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
  ws.getCell("M3").font = { name: "Calibri", size: 11, bold: true, color: { argb: PURPLE } };
  ws.getCell("N3").font = { name: "Calibri", size: 11, bold: true, color: { argb: MAROON } };

  for (let r = 3; r <= 4; r++) {
    for (let c = 1; c <= 14; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.border = thinBorder;
      cell.alignment = centerMiddle;
    }
  }

  // Data Rows (Starting at row 5)
  let currentRow = 5;
  const classStartRowMap = new Map<string, number>();
  const stageStartRowMap = new Map<string, number>();

  data.sectionRows.forEach((r) => {
    const row = ws.addRow([
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
      r.stageTotal,
    ]);
    row.height = 21;

    // Track starts for merges
    if (r.isFirstInSection) {
      classStartRowMap.set(r.classLevel, currentRow);
    }
    if (r.isFirstInStage) {
      stageStartRowMap.set(r.stageGroup, currentRow);
    }

    // Cell Styling
    row.getCell(1).font = { name: "Calibri", size: 12, bold: true, color: { argb: BLUE } }; // Label
    row.getCell(2).font = { name: "Calibri", size: 12, bold: false, color: { argb: NAVY } }; // B Hindu
    row.getCell(3).font = { name: "Calibri", size: 12, bold: false, color: { argb: GREEN } }; // B Muslim
    row.getCell(4).font = { name: "Calibri", size: 12, bold: true, color: { argb: DARK_GREEN } }; // Total B
    row.getCell(5).font = { name: "Calibri", size: 13, bold: true, italic: true, color: { argb: DARK_GREEN } }; // B Class

    row.getCell(6).font = { name: "Calibri", size: 12, bold: false, color: { argb: RED } }; // G Hindu
    row.getCell(7).font = { name: "Calibri", size: 12, bold: false, color: { argb: GREEN } }; // G Muslim
    row.getCell(8).font = { name: "Calibri", size: 12, bold: true, italic: true, color: { argb: RED } }; // Total G
    row.getCell(9).font = { name: "Calibri", size: 13, bold: true, italic: true, color: { argb: MAROON } }; // G Class

    row.getCell(10).font = { name: "Calibri", size: 12, bold: true, italic: true, color: { argb: NAVY } }; // Total Hindu
    row.getCell(11).font = { name: "Calibri", size: 12, bold: true, italic: true, color: { argb: GREEN } }; // Total Muslim
    row.getCell(12).font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF000000" } }; // Total Students
    row.getCell(13).font = { name: "Calibri", size: 13, bold: true, italic: true, color: { argb: PURPLE } }; // Students in Class
    row.getCell(14).font = { name: "Calibri", size: 14, bold: true, italic: true, color: { argb: MAROON } }; // Stage Total

    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.alignment = centerMiddle;
    }

    currentRow++;
  });

  // Apply Class Vertical Merges (Cols E, I, J, K, M)
  const processedClasses = new Set<string>();
  data.sectionRows.forEach((r) => {
    if (!processedClasses.has(r.classLevel) && r.sectionCountInClass > 1) {
      processedClasses.add(r.classLevel);
      const start = classStartRowMap.get(r.classLevel)!;
      const end = start + r.sectionCountInClass - 1;
      ws.mergeCells(`E${start}:E${end}`); // Boys in Class
      ws.mergeCells(`I${start}:I${end}`); // Girls in Class
      ws.mergeCells(`J${start}:J${end}`); // Total Hindu
      ws.mergeCells(`K${start}:K${end}`); // Total Muslim
      ws.mergeCells(`M${start}:M${end}`); // Students in Class
    }
  });

  // Apply Stage Vertical Merges (Col N: Total Student)
  const processedStages = new Set<string>();
  data.sectionRows.forEach((r) => {
    if (!processedStages.has(r.stageGroup)) {
      processedStages.add(r.stageGroup);
      const start = stageStartRowMap.get(r.stageGroup)!;
      const end = start + r.stageRowCount - 1;
      if (end > start) {
        ws.mergeCells(`N${start}:N${end}`);
      }
    }
  });

  // Top Table Grand Totals Row
  const totRow = ws.addRow([
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
    "Total Students",
    "",
    data.totals.totalStudents,
  ]);
  totRow.height = 24;
  const totRowNum = currentRow;
  ws.mergeCells(`L${totRowNum}:M${totRowNum}`);

  totRow.getCell(1).font = { name: "Calibri", size: 13, bold: true, color: { argb: BLUE } };
  totRow.getCell(2).font = { name: "Calibri", size: 13, bold: true, color: { argb: NAVY } };
  totRow.getCell(3).font = { name: "Calibri", size: 13, bold: true, color: { argb: GREEN } };
  totRow.getCell(4).font = { name: "Calibri", size: 13, bold: true, color: { argb: DARK_GREEN } };
  totRow.getCell(5).font = { name: "Calibri", size: 13, bold: true, color: { argb: DARK_GREEN } };
  totRow.getCell(6).font = { name: "Calibri", size: 13, bold: true, color: { argb: GREEN } };
  totRow.getCell(7).font = { name: "Calibri", size: 13, bold: true, color: { argb: GREEN } };
  totRow.getCell(8).font = { name: "Calibri", size: 13, bold: true, color: { argb: RED } };
  totRow.getCell(9).font = { name: "Calibri", size: 13, bold: true, color: { argb: MAROON } };
  totRow.getCell(10).font = { name: "Calibri", size: 13, bold: true, color: { argb: NAVY } };
  totRow.getCell(11).font = { name: "Calibri", size: 13, bold: true, color: { argb: GREEN } };
  totRow.getCell(12).font = { name: "Calibri", size: 12, bold: true, color: { argb: RED } };
  totRow.getCell(14).font = { name: "Calibri", size: 14, bold: true, color: { argb: MAROON } };

  for (let c = 1; c <= 14; c++) {
    const cell = totRow.getCell(c);
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "double", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
    cell.alignment = centerMiddle;
  }
  currentRow++;

  // ─────────────────────────────────────────────────────────────────────────────
  // BOTTOM TABLES: SIDE-BY-SIDE (Class Breakdown on Left, Differentials on Right)
  // ─────────────────────────────────────────────────────────────────────────────
  const bHeader1 = ws.addRow([
    "Class",
    "Boys",
    "",
    "Girls",
    "",
    "",
    "Boys",
    "Girls",
    "Deferentials",
    "Hindu",
    "Muslim",
    "Total Student",
  ]);
  bHeader1.height = 24;

  const bHeader2 = ws.addRow([
    "",
    "Hindu",
    "Muslim",
    "Hindu",
    "Muslim",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  bHeader2.height = 22;

  const bh1Num = currentRow;
  const bh2Num = currentRow + 1;

  ws.mergeCells(`A${bh1Num}:A${bh2Num}`); // Class
  ws.mergeCells(`B${bh1Num}:C${bh1Num}`); // Boys
  ws.mergeCells(`D${bh1Num}:E${bh1Num}`); // Girls
  ws.mergeCells(`G${bh1Num}:G${bh2Num}`); // Boys (Diff)
  ws.mergeCells(`H${bh1Num}:H${bh2Num}`); // Girls (Diff)
  ws.mergeCells(`I${bh1Num}:I${bh2Num}`); // Deferentials
  ws.mergeCells(`J${bh1Num}:J${bh2Num}`); // Hindu (Diff)
  ws.mergeCells(`K${bh1Num}:K${bh2Num}`); // Muslim (Diff)
  ws.mergeCells(`L${bh1Num}:L${bh2Num}`); // Total Student (Diff)

  ws.getCell(`A${bh1Num}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: BLUE } };
  ws.getCell(`B${bh1Num}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: GREEN } };
  ws.getCell(`B${bh2Num}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: NAVY } };
  ws.getCell(`C${bh2Num}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: GREEN } };
  ws.getCell(`D${bh1Num}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: RED } };
  ws.getCell(`D${bh2Num}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: RED } };
  ws.getCell(`E${bh2Num}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: GREEN } };

  ws.getCell(`G${bh1Num}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: DARK_GREEN } };
  ws.getCell(`H${bh1Num}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: MAROON } };
  ws.getCell(`I${bh1Num}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: NAVY } };
  ws.getCell(`J${bh1Num}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: NAVY } };
  ws.getCell(`K${bh1Num}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: GREEN } };
  ws.getCell(`L${bh1Num}`).font = { name: "Calibri", size: 10, bold: true, color: { argb: MAROON } };

  for (let r = bh1Num; r <= bh2Num; r++) {
    for (let c = 1; c <= 12; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.border = thinBorder;
      cell.alignment = centerMiddle;
    }
  }
  currentRow += 2;

  // 8 Class Rows (V to XII)
  for (let i = 0; i < 8; i++) {
    const cs = data.classSummaries[i];
    const diff = data.differentials[i] || null;

    const row = ws.addRow([
      cs.classLevel,
      cs.boysHindu,
      cs.boysMuslim,
      cs.girlsHindu,
      cs.girlsMuslim,
      cs.totalStudents,
      diff && diff.label !== "Total Hindu/Muslim" ? diff.boys : "",
      diff && diff.label !== "Total Hindu/Muslim" ? diff.girls : "",
      diff ? diff.label : "",
      diff ? diff.hindu : "",
      diff ? diff.muslim : "",
      diff && diff.label !== "Total Hindu/Muslim" ? diff.total : "",
    ]);
    row.height = 21;

    row.getCell(1).font = { name: "Calibri", size: 12, bold: true, italic: true, color: { argb: BLUE } }; // Class
    row.getCell(2).font = { name: "Calibri", size: 12, italic: true, color: { argb: NAVY } };
    row.getCell(3).font = { name: "Calibri", size: 12, italic: true, color: { argb: GREEN } };
    row.getCell(4).font = { name: "Calibri", size: 12, italic: true, color: { argb: NAVY } };
    row.getCell(5).font = { name: "Calibri", size: 12, italic: true, color: { argb: GREEN } };
    row.getCell(6).font = { name: "Calibri", size: 12, bold: true, italic: true, color: { argb: BLUE } };

    row.getCell(7).font = { name: "Calibri", size: 12, color: { argb: NAVY } };
    row.getCell(8).font = { name: "Calibri", size: 12, color: { argb: MAROON } };
    row.getCell(9).font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: diff?.label === "Total Hindu/Muslim" ? NAVY : OLIVE },
    };
    row.getCell(10).font = { name: "Calibri", size: 12, color: { argb: NAVY } };
    row.getCell(11).font = { name: "Calibri", size: 12, color: { argb: GREEN } };
    row.getCell(12).font = { name: "Calibri", size: 13, bold: true, color: { argb: MAROON } };

    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.alignment = centerMiddle;
    }
  }

  // Column Widths
  ws.columns = [
    { width: 9 },  // A: Class Label
    { width: 8 },  // B: B Hindu
    { width: 8 },  // C: B Muslim
    { width: 9 },  // D: Total Boys
    { width: 11 }, // E: Boys in Class
    { width: 8 },  // F: G Hindu
    { width: 8 },  // G: G Muslim
    { width: 9 },  // H: Total Girls
    { width: 11 }, // I: Girls in Class
    { width: 10 }, // J: Total Hindu
    { width: 10 }, // K: Total Muslim
    { width: 11 }, // L: Total Students
    { width: 12 }, // M: Students in Class
    { width: 12 }, // N: Total Student
  ];

  // Download directly in browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Students_Strength_${data.academicYear}_${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORD DOCUMENT EXPORT USING DOCX (.docx)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportClassicStrengthWord(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = "2026"
) {
  const data = computeClassicStrengthData(students, schoolName, customDate, academicYear);

  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    WidthType,
    AlignmentType,
    VerticalAlign,
    PageOrientation,
    BorderStyle,
  } = await import("docx");

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  };

  const createCell = (
    text: string | number,
    opts: {
      bold?: boolean;
      italic?: boolean;
      color?: string;
      rowSpan?: number;
      colSpan?: number;
      size?: number;
    } = {}
  ) => {
    return new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: String(text),
              bold: opts.bold ?? false,
              italics: opts.italic ?? false,
              color: opts.color ?? "000000",
              size: (opts.size || 9.5) * 2,
            }),
          ],
        }),
      ],
      borders: cellBorder,
      verticalAlign: VerticalAlign.CENTER,
      rowSpan: opts.rowSpan,
      columnSpan: opts.colSpan,
    });
  };

  // Build Top Table Rows
  const table1Rows: TableRow[] = [];

  // Header 1
  table1Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Class", { bold: true, rowSpan: 2, color: "004080" }),
        createCell("Boys", { bold: true, colSpan: 2, color: "008000" }),
        createCell("Total Boys", { bold: true, rowSpan: 2, color: "008000" }),
        createCell("Boys in Class", { bold: true, rowSpan: 2, color: "006600" }),
        createCell("Girls", { bold: true, colSpan: 2, color: "C00000" }),
        createCell("Total Girls", { bold: true, rowSpan: 2, color: "C00000" }),
        createCell("Girls in Class", { bold: true, rowSpan: 2, color: "800000" }),
        createCell("Total Hindu", { bold: true, rowSpan: 2, color: "002060" }),
        createCell("Total Muslim", { bold: true, rowSpan: 2, color: "008000" }),
        createCell("Total Students", { bold: true, rowSpan: 2 }),
        createCell("Students in Class", { bold: true, rowSpan: 2, color: "7030A0" }),
        createCell("Total Student", { bold: true, rowSpan: 2, color: "800000" }),
      ],
    })
  );

  // Header 2
  table1Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Hindu", { bold: true, color: "002060" }),
        createCell("Muslim", { bold: true, color: "008000" }),
        createCell("Hindu", { bold: true, color: "C00000" }),
        createCell("Muslim", { bold: true, color: "008000" }),
      ],
    })
  );

  // Data Rows
  data.sectionRows.forEach((r) => {
    const cells: TableCell[] = [];
    cells.push(createCell(r.displayLabel, { bold: true, color: "004080" }));
    cells.push(createCell(r.boysHindu, { color: "002060" }));
    cells.push(createCell(r.boysMuslim, { color: "008000" }));
    cells.push(createCell(r.totalBoys, { bold: true, color: "006600" }));

    if (r.isFirstInSection) {
      cells.push(
        createCell(r.boysInClass, {
          bold: true,
          italic: true,
          color: "006600",
          rowSpan: r.sectionCountInClass,
        })
      );
    }

    cells.push(createCell(r.girlsHindu, { color: "C00000" }));
    cells.push(createCell(r.girlsMuslim, { color: "008000" }));
    cells.push(createCell(r.totalGirls, { bold: true, italic: true, color: "C00000" }));

    if (r.isFirstInSection) {
      cells.push(
        createCell(r.girlsInClass, {
          bold: true,
          italic: true,
          color: "800000",
          rowSpan: r.sectionCountInClass,
        })
      );
      cells.push(
        createCell(r.totalHindu, {
          bold: true,
          italic: true,
          color: "002060",
          rowSpan: r.sectionCountInClass,
        })
      );
      cells.push(
        createCell(r.totalMuslim, {
          bold: true,
          italic: true,
          color: "008000",
          rowSpan: r.sectionCountInClass,
        })
      );
    }

    cells.push(createCell(r.totalStudents, { bold: true }));

    if (r.isFirstInSection) {
      cells.push(
        createCell(r.studentsInClass, {
          bold: true,
          italic: true,
          color: "7030A0",
          rowSpan: r.sectionCountInClass,
        })
      );
    }

    if (r.isFirstInStage) {
      cells.push(
        createCell(r.stageTotal, {
          bold: true,
          italic: true,
          color: "800000",
          rowSpan: r.stageRowCount,
        })
      );
    }

    table1Rows.push(new TableRow({ cantSplit: true, children: cells }));
  });

  // Top Totals Row
  table1Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Total", { bold: true, color: "004080" }),
        createCell(data.totals.boysHindu, { bold: true, color: "002060" }),
        createCell(data.totals.boysMuslim, { bold: true, color: "008000" }),
        createCell(data.totals.totalBoys, { bold: true, color: "006600" }),
        createCell(data.totals.totalBoys, { bold: true, color: "006600" }),
        createCell(data.totals.girlsHindu, { bold: true, color: "008000" }),
        createCell(data.totals.girlsMuslim, { bold: true, color: "008000" }),
        createCell(data.totals.totalGirls, { bold: true, color: "C00000" }),
        createCell(data.totals.totalGirls, { bold: true, color: "800000" }),
        createCell(data.totals.totalHindu, { bold: true, color: "002060" }),
        createCell(data.totals.totalMuslim, { bold: true, color: "008000" }),
        createCell("Total Students", { bold: true, color: "C00000", colSpan: 2 }),
        createCell(data.totals.totalStudents, { bold: true, color: "800000" }),
      ],
    })
  );

  // Build Bottom Table (Side-by-Side)
  const table2Rows: TableRow[] = [];

  // Bottom Header 1
  table2Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Class", { bold: true, rowSpan: 2, color: "004080" }),
        createCell("Boys", { bold: true, colSpan: 2, color: "008000" }),
        createCell("Girls", { bold: true, colSpan: 2, color: "C00000" }),
        createCell("Total", { bold: true, rowSpan: 2, color: "004080" }),
        createCell("Boys", { bold: true, rowSpan: 2, color: "006600" }),
        createCell("Girls", { bold: true, rowSpan: 2, color: "800000" }),
        createCell("Deferentials", { bold: true, rowSpan: 2, color: "002060" }),
        createCell("Hindu", { bold: true, rowSpan: 2, color: "002060" }),
        createCell("Muslim", { bold: true, rowSpan: 2, color: "008000" }),
        createCell("Total Student", { bold: true, rowSpan: 2, color: "800000" }),
      ],
    })
  );

  // Bottom Header 2
  table2Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Hindu", { bold: true, color: "002060" }),
        createCell("Muslim", { bold: true, color: "008000" }),
        createCell("Hindu", { bold: true, color: "C00000" }),
        createCell("Muslim", { bold: true, color: "008000" }),
      ],
    })
  );

  // Bottom Data Rows (8 classes)
  for (let i = 0; i < 8; i++) {
    const cs = data.classSummaries[i];
    const diff = data.differentials[i] || null;

    table2Rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          createCell(cs.classLevel, { bold: true, italic: true, color: "004080" }),
          createCell(cs.boysHindu, { italic: true, color: "002060" }),
          createCell(cs.boysMuslim, { italic: true, color: "008000" }),
          createCell(cs.girlsHindu, { italic: true, color: "002060" }),
          createCell(cs.girlsMuslim, { italic: true, color: "008000" }),
          createCell(cs.totalStudents, { bold: true, italic: true, color: "004080" }),
          createCell(diff && diff.label !== "Total Hindu/Muslim" ? diff.boys : "", { color: "002060" }),
          createCell(diff && diff.label !== "Total Hindu/Muslim" ? diff.girls : "", { color: "800000" }),
          createCell(diff ? diff.label : "", {
            bold: true,
            color: diff?.label === "Total Hindu/Muslim" ? "002060" : "4F6228",
          }),
          createCell(diff ? diff.hindu : "", { color: "002060" }),
          createCell(diff ? diff.muslim : "", { color: "008000" }),
          createCell(diff && diff.label !== "Total Hindu/Muslim" ? diff.total : "", {
            bold: true,
            color: "800000",
          }),
        ],
      })
    );
  }

  // Create Document in Landscape A4 Orientation
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838, // Exactly A4 Landscape width (297 mm in dxa)
              height: 11906, // Exactly A4 Landscape height (210 mm in dxa)
            },
            margin: {
              top: 400, // Compact ~0.28 in margin to ensure single A4 page fit
              bottom: 400,
              left: 400,
              right: 400,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: data.schoolName,
                bold: true,
                color: "800000",
                size: 28, // 14pt
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: data.reportTitle,
                bold: true,
                italics: true,
                color: "002060",
                size: 20, // 10pt
              }),
            ],
          }),
          new Table({
            rows: table1Rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ spacing: { before: 120, after: 80 } }),
          new Table({
            rows: table2Rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          // Document Signature & Footer Block
          new Paragraph({ spacing: { before: 180 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Generated from Marigachi High School SMS",
                            size: 16, // 8pt
                            italics: true,
                            color: "666666",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: "Headmaster / TIC Signature",
                            bold: true,
                            size: 18, // 9pt
                            color: "000000",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Students_Strength_${data.academicYear}_${new Date().toISOString().split("T")[0]}.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT HELPER (.csv)
// ─────────────────────────────────────────────────────────────────────────────
export function exportClassicStrengthCsv(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = "2026"
) {
  const data = computeClassicStrengthData(students, schoolName, customDate, academicYear);
  const rows: string[][] = [];

  rows.push([`"${data.schoolName}"`]);
  rows.push([`"${data.reportTitle}"`]);
  rows.push([]);

  // Top Table
  rows.push([
    "Class",
    "Boys (Hindu)",
    "Boys (Muslim)",
    "Total Boys",
    "Boys in Class",
    "Girls (Hindu)",
    "Girls (Muslim)",
    "Total Girls",
    "Girls in Class",
    "Total Hindu",
    "Total Muslim",
    "Total Students",
    "Students in Class",
    "Stage Total",
  ]);

  data.sectionRows.forEach((r) => {
    rows.push([
      `"${r.displayLabel}"`,
      String(r.boysHindu),
      String(r.boysMuslim),
      String(r.totalBoys),
      String(r.boysInClass),
      String(r.girlsHindu),
      String(r.girlsMuslim),
      String(r.totalGirls),
      String(r.girlsInClass),
      String(r.totalHindu),
      String(r.totalMuslim),
      String(r.totalStudents),
      String(r.studentsInClass),
      String(r.stageTotal),
    ]);
  });

  rows.push([
    "Total",
    String(data.totals.boysHindu),
    String(data.totals.boysMuslim),
    String(data.totals.totalBoys),
    String(data.totals.totalBoys),
    String(data.totals.girlsHindu),
    String(data.totals.girlsMuslim),
    String(data.totals.totalGirls),
    String(data.totals.totalGirls),
    String(data.totals.totalHindu),
    String(data.totals.totalMuslim),
    String(data.totals.totalStudents),
    String(data.totals.totalStudents),
    String(data.totals.totalStudents),
  ]);

  rows.push([]);
  rows.push([]);
  rows.push(["Class-Wise Summary", "", "", "", "", "Deferentials", "", "", "", "", ""]);
  rows.push([
    "Class",
    "Boys (H)",
    "Boys (M)",
    "Girls (H)",
    "Girls (M)",
    "Total",
    "Boys",
    "Girls",
    "Deferentials",
    "Hindu",
    "Muslim",
    "Total Student",
  ]);

  for (let i = 0; i < 8; i++) {
    const cs = data.classSummaries[i];
    const diff = data.differentials[i] || null;
    rows.push([
      `"${cs.classLevel}"`,
      String(cs.boysHindu),
      String(cs.boysMuslim),
      String(cs.girlsHindu),
      String(cs.girlsMuslim),
      String(cs.totalStudents),
      diff && diff.label !== "Total Hindu/Muslim" ? String(diff.boys) : "",
      diff && diff.label !== "Total Hindu/Muslim" ? String(diff.girls) : "",
      diff ? `"${diff.label}"` : "",
      diff ? String(diff.hindu) : "",
      diff ? String(diff.muslim) : "",
      diff && diff.label !== "Total Hindu/Muslim" ? String(diff.total) : "",
    ]);
  }

  const csvContent = "\uFEFF" + rows.map((e) => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Students_Strength_${data.academicYear}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
