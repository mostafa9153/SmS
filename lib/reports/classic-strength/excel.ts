import type ExcelJS from "exceljs";
import type { Student } from "@/lib/types";
import { todayIST } from "@/lib/utils/date";
import { currentYearIST } from "@/lib/utils/academic-year";
import { computeClassicStrengthData } from "@/lib/reports/classic-strength/compute";

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT USING EXCELJS (Colors, Borders, Fonts, Merges, Centering)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportClassicStrengthExcel(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = String(currentYearIST())
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
  a.download = `Students_Strength_${data.academicYear}_${todayIST()}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
